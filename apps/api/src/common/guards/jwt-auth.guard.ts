import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload, AuthenticatedUser } from '../types/auth.types';

// Re-export für einfacheren Import in anderen Modulen
export { AuthenticatedUser } from '../types/auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Kein Authentifizierungs-Token vorhanden');
    }

    try {
      const payload = this.verifyToken(token);
      const user = this.extractUserFromPayload(payload);

      // Attach user to request
      (request as Request & { user: AuthenticatedUser }).user = user;

      // Check required roles if specified
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((role) => user.roles.includes(role));
        if (!hasRole) {
          throw new UnauthorizedException('Unzureichende Berechtigungen');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn('Authentifizierung fehlgeschlagen', error);
      throw new UnauthorizedException('Ungültiger oder abgelaufener Token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // 1. Versuche zuerst den Token aus dem httpOnly Cookie zu lesen
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.['access_token'];
    if (cookieToken) {
      return cookieToken;
    }

    // 2. Fallback: Authorization Header (für API-Clients/Testing)
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private verifyToken(token: string): JwtPayload {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET nicht konfiguriert');
    }

    return jwt.verify(token, jwtSecret) as JwtPayload;
  }

  private extractUserFromPayload(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      roles: [payload.role], // Single role als Array für @Roles() Kompatibilität
    };
  }
}
