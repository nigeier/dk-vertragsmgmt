import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';

interface TokenPayload {
  sub: string;
  email: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  realm_access?: {
    roles: string[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user via Keycloak
   * In production, this would call Keycloak's token endpoint
   */
  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // In production, you would call Keycloak's token endpoint:
    // POST ${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token
    // with grant_type=password, client_id, client_secret, username, password

    // For development/demo, we'll simulate the flow
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    try {
      // In production, make HTTP call to Keycloak
      // const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      //   body: new URLSearchParams({
      //     grant_type: 'password',
      //     client_id: clientId,
      //     client_secret: clientSecret,
      //     username: loginDto.username,
      //     password: loginDto.password,
      //   }),
      // });

      // For now, create a development token
      // This should be replaced with actual Keycloak integration
      this.logger.warn('Using development token generation - replace with Keycloak in production');

      const expiresIn = 900; // 15 minutes

      const payload: TokenPayload = {
        sub: 'dev-user-id',
        email: loginDto.username.includes('@') ? loginDto.username : `${loginDto.username}@drykorn.de`,
        preferred_username: loginDto.username,
        given_name: 'Dev',
        family_name: 'User',
        realm_access: {
          roles: ['USER', 'MANAGER'],
        },
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn,
      });

      const refreshToken = this.jwtService.sign(
        { sub: payload.sub, type: 'refresh' },
        { expiresIn: '7d' },
      );

      // Ensure user exists in local database
      await this.ensureUserExists(payload);

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { keycloakId: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const expiresIn = 900; // 15 minutes

      const newPayload: TokenPayload = {
        sub: user.keycloakId,
        email: user.email,
        preferred_username: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
        realm_access: {
          roles: ['USER'], // In production, fetch from Keycloak
        },
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn,
      });

      return {
        accessToken,
        expiresIn,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    // Enrich with database info if needed
    const dbUser = await this.prisma.user.findUnique({
      where: { keycloakId: user.id },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
    };
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(userId: string): Promise<void> {
    // In production with Keycloak, you would:
    // 1. Call Keycloak's logout endpoint
    // 2. Invalidate the refresh token
    // 3. Clear any server-side session

    this.logger.log(`User ${userId} logged out`);
  }

  /**
   * Ensure user exists in local database (sync from Keycloak)
   */
  private async ensureUserExists(payload: TokenPayload): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { keycloakId: payload.sub },
    });

    if (!existingUser) {
      await this.prisma.user.create({
        data: {
          keycloakId: payload.sub,
          email: payload.email,
          firstName: payload.given_name || 'Unknown',
          lastName: payload.family_name || 'User',
          isActive: true,
        },
      });
    }
  }
}
