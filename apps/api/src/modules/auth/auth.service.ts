import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, AuthenticatedUser, LoginContext } from '../../common/types/auth.types';
import { UserStatus } from '@prisma/client';
import { escapeHtml } from '../../common/utils/string.utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly MAX_2FA_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly TWO_FACTOR_LOCKOUT_MINUTES = 10;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * Login mit E-Mail und Passwort
   */
  async login(
    loginDto: LoginDto,
    context: LoginContext = {},
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: AuthenticatedUser;
    requiresTwoFactor?: boolean;
  }> {
    const { ipAddress, userAgent } = context;

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user) {
      this.logger.warn(
        `Fehlgeschlagener Login-Versuch für unbekannte E-Mail: ${loginDto.email} von IP: ${ipAddress}`,
      );
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    // Prüfe User-Status
    if (user.status === UserStatus.PENDING) {
      this.logger.warn(`Login-Versuch von Pending-User: ${user.email}`);
      throw new ForbiddenException('Ihr Konto wartet noch auf Freigabe durch einen Administrator.');
    }

    if (user.status === UserStatus.REJECTED) {
      this.logger.warn(`Login-Versuch von abgelehntem User: ${user.email}`);
      throw new ForbiddenException(
        'Ihre Registrierung wurde abgelehnt. Bitte kontaktieren Sie den Administrator.',
      );
    }

    // Prüfe ob Account gesperrt ist
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      this.logger.warn(`Gesperrter Account Login-Versuch: ${user.email} von IP: ${ipAddress}`);
      throw new ForbiddenException(
        `Konto ist vorübergehend gesperrt. Bitte versuchen Sie es in ${remainingMinutes} Minuten erneut.`,
      );
    }

    if (!user.isActive) {
      this.logger.warn(`Deaktivierter Account Login-Versuch: ${user.email} von IP: ${ipAddress}`);
      throw new UnauthorizedException('Benutzerkonto ist deaktiviert');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.email, ipAddress);
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    // Reset failed login attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
    });

    // Prüfe ob 2FA aktiviert ist
    if (user.twoFactorEnabled) {
      if (loginDto.twoFactorCode) {
        const isValid = await this.verifyTwoFactorCode(user.id, loginDto.twoFactorCode);
        if (!isValid) {
          throw new UnauthorizedException('Ungültiger 2FA-Code');
        }
      } else {
        // 2FA erforderlich, aber kein Code gesendet
        return {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            roles: [user.role],
          },
          requiresTwoFactor: true,
        };
      }
    }

    const expiresIn = 900; // 15 Minuten

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn });

    // Create refresh token and store in DB
    const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);

    this.logger.log(`Benutzer ${user.email} hat sich angemeldet von IP: ${ipAddress}`);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roles: [user.role],
      },
    };
  }

  /**
   * Creates and stores a refresh token in the database
   */
  private async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    // Generate a secure random token
    const tokenValue = crypto.randomBytes(64).toString('hex');

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        token: tokenValue,
        userId,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Create JWT wrapper for the token (contains reference to DB token)
    const refreshJwt = this.jwtService.sign(
      { sub: userId, token: tokenValue, type: 'refresh' },
      { expiresIn: `${this.REFRESH_TOKEN_EXPIRY_DAYS}d` },
    );

    return refreshJwt;
  }

  /**
   * Cookie-Optionen für httpOnly Cookies
   */
  getCookieOptions(maxAgeSeconds: number): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  } {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAgeSeconds * 1000,
      path: '/',
    };
  }

  /**
   * Behandelt fehlgeschlagene Login-Versuche
   */
  private async handleFailedLogin(
    userId: string,
    email: string,
    ipAddress?: string,
  ): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastFailedLoginAt: new Date(),
      },
    });

    const attempts = user.failedLoginAttempts;

    this.logger.warn(
      `Fehlgeschlagener Login-Versuch #${attempts} für ${email} von IP: ${ipAddress}`,
    );

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);

      const lockedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: lockUntil },
        select: { firstName: true, lastName: true },
      });

      this.logger.warn(
        `Account ${email} wurde für ${this.LOCKOUT_DURATION_MINUTES} Minuten gesperrt nach ${attempts} fehlgeschlagenen Versuchen`,
      );

      try {
        await this.emailService.sendAccountLockedEmail({
          to: email,
          userName: `${lockedUser.firstName} ${lockedUser.lastName}`,
          lockDurationMinutes: this.LOCKOUT_DURATION_MINUTES,
          ipAddress: ipAddress || 'Unbekannt',
        });
      } catch (emailError) {
        this.logger.error(`Failed to send account locked email: ${String(emailError)}`);
      }
    }
  }

  /**
   * Verifiziert einen 2FA TOTP-Code mit Rate-Limiting
   */
  async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        twoFactorSecret: true,
        twoFactorFailedAttempts: true,
        twoFactorLockedUntil: true,
      },
    });

    if (!user?.twoFactorSecret) {
      return false;
    }

    // Prüfe ob 2FA gesperrt ist
    if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.twoFactorLockedUntil.getTime() - Date.now()) / 60000,
      );
      this.logger.warn(`2FA gesperrt für ${user.email}, ${remainingMinutes} Minuten verbleibend`);
      throw new ForbiddenException(
        `Zu viele fehlgeschlagene 2FA-Versuche. Bitte warten Sie ${remainingMinutes} Minuten.`,
      );
    }

    try {
      const { authenticator } = await import('otplib');
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });

      if (isValid) {
        // Reset 2FA-Fehlversuche bei Erfolg
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorFailedAttempts: 0,
            twoFactorLockedUntil: null,
          },
        });
        return true;
      }

      // Fehlversuch zählen
      await this.handle2FAFailedAttempt(userId, user.email);
      return false;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('otplib nicht installiert - 2FA-Verifizierung fehlgeschlagen');
      return false;
    }
  }

  /**
   * Behandelt fehlgeschlagene 2FA-Versuche
   */
  private async handle2FAFailedAttempt(userId: string, email: string): Promise<void> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorFailedAttempts: { increment: 1 },
      },
    });

    const attempts = updated.twoFactorFailedAttempts;
    this.logger.warn(`Fehlgeschlagener 2FA-Versuch #${attempts} für ${email}`);

    if (attempts >= this.MAX_2FA_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + this.TWO_FACTOR_LOCKOUT_MINUTES * 60 * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorLockedUntil: lockUntil },
      });

      this.logger.warn(
        `2FA für ${email} wurde für ${this.TWO_FACTOR_LOCKOUT_MINUTES} Minuten gesperrt nach ${attempts} fehlgeschlagenen Versuchen`,
      );
    }
  }

  /**
   * Self-Registration - Benutzer registriert sich selbst (Status: PENDING)
   */
  async register(registerDto: RegisterDto): Promise<{ id: string; email: string; status: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('E-Mail-Adresse ist bereits registriert');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: 'USER', // Default role for self-registration
        status: UserStatus.PENDING, // Must be approved by admin
        department: registerDto.department,
      },
    });

    this.logger.log(`Neue Registrierung (pending): ${user.email}`);

    // Notify admins about new registration
    await this.notifyAdminsOfNewRegistration(user);

    return {
      id: user.id,
      email: user.email,
      status: user.status,
    };
  }

  /**
   * Admin creates a user directly (Status: ACTIVE)
   */
  async createUserByAdmin(
    registerDto: RegisterDto,
    adminId: string,
  ): Promise<{ id: string; email: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('E-Mail-Adresse ist bereits registriert');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: registerDto.role || 'USER',
        status: UserStatus.ACTIVE, // Direct activation by admin
        department: registerDto.department,
      },
    });

    this.logger.log(`Benutzer ${user.email} erstellt von Admin ${adminId}`);

    // Send welcome email with password
    try {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        temporaryPassword: registerDto.password,
        loginUrl: `${this.frontendUrl}/login`,
      });
    } catch (emailError) {
      this.logger.error(`Failed to send welcome email: ${String(emailError)}`);
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  /**
   * Notify all admins about a new pending registration
   */
  private async notifyAdminsOfNewRegistration(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          role: 'ADMIN',
          status: UserStatus.ACTIVE,
          isActive: true,
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      // Create in-app notification for each admin
      for (const admin of admins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Neue Benutzerregistrierung',
            message: `${user.firstName} ${user.lastName} (${user.email}) hat sich registriert und wartet auf Freigabe.`,
            link: '/admin/users?status=PENDING',
          },
        });

        // Send email to admin
        await this.emailService.sendGenericEmail(
          admin.email,
          'Neue Benutzerregistrierung wartet auf Freigabe',
          `
            <h2>Neue Registrierung</h2>
            <p>Ein neuer Benutzer hat sich registriert und wartet auf Ihre Freigabe:</p>
            <ul>
              <li><strong>Name:</strong> ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</li>
              <li><strong>E-Mail:</strong> ${escapeHtml(user.email)}</li>
            </ul>
            <p><a href="${this.frontendUrl}/admin/users?status=PENDING" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;">Registrierungen prüfen</a></p>
          `,
        );
      }

      this.logger.log(`${admins.length} Admin(s) über neue Registrierung benachrichtigt`);
    } catch (error) {
      this.logger.error(`Fehler beim Benachrichtigen der Admins: ${String(error)}`);
    }
  }

  /**
   * Admin approves a pending user
   */
  async approveUser(userId: string, adminId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new ConflictException('Benutzer ist nicht im Status "Wartend"');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    this.logger.log(`Benutzer ${user.email} wurde von Admin ${adminId} freigeschaltet`);

    // Notify user
    try {
      await this.emailService.sendGenericEmail(
        user.email,
        'Ihr Konto wurde freigeschaltet',
        `
          <h2>Willkommen bei Drykorn Vertragsmanagement!</h2>
          <p>Hallo ${escapeHtml(user.firstName)},</p>
          <p>Ihr Konto wurde freigeschaltet. Sie können sich jetzt anmelden.</p>
          <p><a href="${this.frontendUrl}/login" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;">Jetzt anmelden</a></p>
        `,
      );
    } catch (emailError) {
      this.logger.error(`Failed to send approval email: ${String(emailError)}`);
    }
  }

  /**
   * Admin rejects a pending user
   */
  async rejectUser(userId: string, adminId: string, reason?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new ConflictException('Benutzer ist nicht im Status "Wartend"');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.REJECTED },
    });

    this.logger.log(`Benutzer ${user.email} wurde von Admin ${adminId} abgelehnt`);

    // Notify user
    try {
      await this.emailService.sendGenericEmail(
        user.email,
        'Ihre Registrierung wurde abgelehnt',
        `
          <h2>Registrierung abgelehnt</h2>
          <p>Hallo ${escapeHtml(user.firstName)},</p>
          <p>Leider wurde Ihre Registrierung abgelehnt.</p>
          ${reason ? `<p><strong>Grund:</strong> ${escapeHtml(reason)}</p>` : ''}
          <p>Bei Fragen wenden Sie sich bitte an den Administrator.</p>
        `,
      );
    } catch (emailError) {
      this.logger.error(`Failed to send rejection email: ${String(emailError)}`);
    }
  }

  /**
   * Get all pending registrations (for admin)
   */
  async getPendingRegistrations(): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      department: string | null;
      createdAt: Date;
    }>
  > {
    return this.prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Access Token mit Refresh Token erneuern (mit Token-Rotation)
   */
  async refreshToken(
    refreshTokenJwt: string,
    context: LoginContext = {},
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Verify JWT wrapper
      const payload = this.jwtService.verify<{ sub: string; token: string; type: string }>(
        refreshTokenJwt,
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Ungültiger Refresh-Token');
      }

      // Check if token exists in DB and is valid
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: payload.token },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh-Token nicht gefunden');
      }

      if (storedToken.revokedAt) {
        // Möglicher Token-Diebstahl: Alle Tokens des Users widerrufen
        this.logger.warn(
          `Versuch, widerrufenen Token zu verwenden für User ${storedToken.userId} - alle Tokens werden widerrufen`,
        );
        await this.revokeAllUserTokens(storedToken.userId);
        throw new UnauthorizedException('Refresh-Token wurde widerrufen. Bitte erneut anmelden.');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh-Token ist abgelaufen');
      }

      const user = storedToken.user;

      if (!user.isActive || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Benutzer ist nicht aktiv');
      }

      // Token-Rotation: Alten Token widerrufen
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      // Neuen Refresh-Token erstellen
      const newRefreshToken = await this.createRefreshToken(
        user.id,
        context.ipAddress,
        context.userAgent,
      );

      const expiresIn = 900; // 15 Minuten

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn });

      this.logger.debug(`Token-Rotation durchgeführt für User ${user.email}`);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Ungültiger oder abgelaufener Refresh-Token');
    }
  }

  /**
   * Benutzerprofil abrufen
   */
  async getProfile(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role,
      roles: [dbUser.role],
    };
  }

  /**
   * Passwort ändern
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Aktuelles Passwort ist falsch');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all refresh tokens on password change (security measure)
    await this.revokeAllUserTokens(userId);

    this.logger.log(`Passwort geändert für Benutzer ${user.email}`);
  }

  /**
   * Logout - revokes current refresh token
   */
  async logout(userId: string, refreshTokenJwt?: string): Promise<void> {
    if (refreshTokenJwt) {
      try {
        const payload = this.jwtService.verify<{ token: string }>(refreshTokenJwt);
        await this.prisma.refreshToken.updateMany({
          where: { token: payload.token, userId },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Token invalid - just log it
      }
    }
    this.logger.log(`Benutzer ${userId} hat sich abgemeldet`);
  }

  /**
   * Logout from all devices - revokes all refresh tokens
   */
  async logoutAllDevices(userId: string): Promise<{ revokedCount: number }> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`${result.count} Sessions für Benutzer ${userId} beendet`);

    return { revokedCount: result.count };
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<
    Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      lastUsedAt: Date | null;
    }>
  > {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw new UnauthorizedException('Session nicht gefunden');
    }

    this.logger.log(`Session ${sessionId} für Benutzer ${userId} beendet`);
  }

  /**
   * Revoke all tokens for a user (internal use)
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Cleanup expired tokens (can be called by scheduled job)
   */
  async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} abgelaufene/widerrufene Tokens gelöscht`);
    }

    return { deletedCount: result.count };
  }

  /**
   * 2FA Setup initiieren - generiert Secret und QR-Code
   */
  async setupTwoFactor(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    if (user.twoFactorEnabled) {
      throw new ConflictException('2FA ist bereits aktiviert');
    }

    try {
      const { authenticator } = await import('otplib');
      const secret = authenticator.generateSecret();

      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret },
      });

      const otpAuthUrl = authenticator.keyuri(user.email, 'Drykorn Vertragsmanagement', secret);

      this.logger.log(`2FA Setup initiiert für ${user.email}`);

      return {
        secret,
        qrCodeUrl: otpAuthUrl,
      };
    } catch {
      throw new Error('otplib nicht installiert. Bitte "npm install otplib" ausführen.');
    }
  }

  /**
   * 2FA aktivieren
   */
  async enableTwoFactor(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    if (user.twoFactorEnabled) {
      throw new ConflictException('2FA ist bereits aktiviert');
    }

    if (!user.twoFactorSecret) {
      throw new ForbiddenException('Bitte zuerst 2FA Setup durchführen');
    }

    const isValid = await this.verifyTwoFactorCode(userId, code);
    if (!isValid) {
      throw new UnauthorizedException('Ungültiger 2FA-Code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    this.logger.log(`2FA aktiviert für ${user.email}`);

    try {
      await this.emailService.sendTwoFactorEnabledEmail({
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`,
      });
    } catch (emailError) {
      this.logger.error(`Failed to send 2FA enabled email: ${String(emailError)}`);
    }
  }

  /**
   * 2FA deaktivieren
   */
  async disableTwoFactor(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    if (!user.twoFactorEnabled) {
      throw new ConflictException('2FA ist nicht aktiviert');
    }

    const isValid = await this.verifyTwoFactorCode(userId, code);
    if (!isValid) {
      throw new UnauthorizedException('Ungültiger 2FA-Code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`2FA deaktiviert für ${user.email}`);
  }

  /**
   * 2FA Status prüfen
   */
  async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    return { enabled: user.twoFactorEnabled };
  }
}
