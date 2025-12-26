import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Param,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TwoFactorCodeDto } from './dto/two-factor.dto';
import { RejectUserDto } from './dto/reject-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditUpdate } from '../../common/decorators/audit.decorator';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { getClientIp, getUserAgent } from '../../common/utils/request.utils';

// Cookie names
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 Login-Versuche pro Minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Benutzer anmelden' })
  @ApiResponse({ status: 200, description: 'Anmeldung erfolgreich' })
  @ApiResponse({ status: 401, description: 'Ungültige Anmeldedaten' })
  @ApiResponse({ status: 403, description: 'Konto gesperrt oder wartend' })
  @ApiResponse({ status: 429, description: 'Zu viele Anfragen' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, {
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    // Wenn 2FA erforderlich ist, keine Cookies setzen
    if (result.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        user: { id: result.user.id, email: result.user.email },
      };
    }

    // Setze httpOnly Cookies (Tokens NICHT im Response-Body)
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      this.authService.getCookieOptions(result.expiresIn),
    );
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      this.authService.getCookieOptions(7 * 24 * 60 * 60), // 7 Tage
    );

    // Tokens nicht im Response-Body zurückgeben (Sicherheit)
    return {
      user: result.user,
      expiresIn: result.expiresIn,
    };
  }

  // ==================== Self-Registration ====================

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 Registrierungen pro Minute
  @ApiOperation({ summary: 'Selbstregistrierung (wartet auf Admin-Freigabe)' })
  @ApiResponse({ status: 201, description: 'Registrierung eingereicht' })
  @ApiResponse({ status: 409, description: 'E-Mail bereits registriert' })
  @ApiResponse({ status: 429, description: 'Zu viele Anfragen' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // ==================== Admin User Management ====================

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Get('admin/pending')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Wartende Registrierungen abrufen' })
  @ApiResponse({ status: 200, description: 'Liste der wartenden Benutzer' })
  async getPendingRegistrations() {
    return this.authService.getPendingRegistrations();
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @AuditUpdate('User')
  @Post('admin/users/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Benutzerregistrierung genehmigen' })
  @ApiResponse({ status: 204, description: 'Benutzer freigeschaltet' })
  @ApiResponse({ status: 404, description: 'Benutzer nicht gefunden' })
  @ApiResponse({ status: 409, description: 'Benutzer nicht im Status Wartend' })
  async approveUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<void> {
    await this.authService.approveUser(userId, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @AuditUpdate('User')
  @Post('admin/users/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Benutzerregistrierung ablehnen' })
  @ApiResponse({ status: 204, description: 'Benutzer abgelehnt' })
  @ApiResponse({ status: 404, description: 'Benutzer nicht gefunden' })
  @ApiResponse({ status: 409, description: 'Benutzer nicht im Status Wartend' })
  async rejectUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: RejectUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<void> {
    await this.authService.rejectUser(userId, admin.id, dto.reason);
  }

  // ==================== Token Management ====================

  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 Refresh-Versuche pro Minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token erneuern (mit Token-Rotation)' })
  @ApiResponse({ status: 200, description: 'Token erneuert' })
  @ApiResponse({ status: 401, description: 'Ungültiger Refresh-Token' })
  @ApiResponse({ status: 429, description: 'Zu viele Anfragen' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Versuche zuerst Token aus Cookie, dann aus Body
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[REFRESH_TOKEN_COOKIE] || refreshTokenDto.refreshToken;
    const result = await this.authService.refreshToken(refreshToken, {
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    // Setze neues Access Token Cookie
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      this.authService.getCookieOptions(result.expiresIn),
    );

    // Setze neuen Refresh Token Cookie (Token-Rotation)
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      this.authService.getCookieOptions(7 * 24 * 60 * 60), // 7 Tage
    );

    // Tokens nicht im Response-Body zurückgeben (Sicherheit)
    return {
      expiresIn: result.expiresIn,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Aktuelles Benutzerprofil abrufen' })
  @ApiResponse({ status: 200, description: 'Profil zurückgegeben' })
  @ApiResponse({ status: 401, description: 'Nicht autorisiert' })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return this.authService.getProfile(user);
  }

  @UseGuards(JwtAuthGuard)
  @AuditUpdate('User')
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Passwort ändern' })
  @ApiResponse({ status: 204, description: 'Passwort geändert' })
  @ApiResponse({ status: 401, description: 'Aktuelles Passwort falsch' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Benutzer abmelden' })
  @ApiResponse({ status: 204, description: 'Abmeldung erfolgreich' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[REFRESH_TOKEN_COOKIE];
    await this.authService.logout(user.id, refreshToken);

    // Lösche Cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  }

  // ==================== Session Management ====================

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Aktive Sessions abrufen' })
  @ApiResponse({ status: 200, description: 'Liste der aktiven Sessions' })
  async getActiveSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getActiveSessions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Bestimmte Session beenden' })
  @ApiResponse({ status: 204, description: 'Session beendet' })
  @ApiResponse({ status: 404, description: 'Session nicht gefunden' })
  async revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.authService.revokeSession(user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Von allen Geräten abmelden' })
  @ApiResponse({ status: 200, description: 'Alle Sessions beendet' })
  async logoutAllDevices(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAllDevices(user.id);

    // Lösche auch aktuelle Cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });

    return result;
  }

  // ==================== 2FA Endpoints ====================

  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '2FA Status abrufen' })
  @ApiResponse({ status: 200, description: '2FA Status' })
  async getTwoFactorStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getTwoFactorStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '2FA Setup starten' })
  @ApiResponse({ status: 200, description: 'Secret und QR-Code URL' })
  @ApiResponse({ status: 409, description: '2FA bereits aktiviert' })
  @AuditUpdate('User')
  async setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '2FA aktivieren' })
  @ApiResponse({ status: 204, description: '2FA aktiviert' })
  @ApiResponse({ status: 401, description: 'Ungültiger Code' })
  @AuditUpdate('User')
  async enableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TwoFactorCodeDto,
  ): Promise<void> {
    await this.authService.enableTwoFactor(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '2FA deaktivieren' })
  @ApiResponse({ status: 204, description: '2FA deaktiviert' })
  @ApiResponse({ status: 401, description: 'Ungültiger Code' })
  @AuditUpdate('User')
  async disableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TwoFactorCodeDto,
  ): Promise<void> {
    await this.authService.disableTwoFactor(user.id, dto.code);
  }
}
