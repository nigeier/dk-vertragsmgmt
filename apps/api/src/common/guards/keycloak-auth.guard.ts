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

interface KeycloakTokenPayload {
  sub: string;
  email: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
  exp: number;
  iat: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private readonly logger = new Logger(KeycloakAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.verifyToken(token);
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
          throw new UnauthorizedException('Insufficient permissions');
        }
      }

      return true;
    } catch (error) {
      this.logger.warn('Authentication failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private async verifyToken(token: string): Promise<KeycloakTokenPayload> {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // In production, you would verify against Keycloak's public key
    // For now, we use a shared secret for development
    return jwt.verify(token, jwtSecret) as KeycloakTokenPayload;
  }

  private extractUserFromPayload(payload: KeycloakTokenPayload): AuthenticatedUser {
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'contract-management');

    // Collect roles from realm and resource access
    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.[clientId]?.roles || [];
    const roles = [...new Set([...realmRoles, ...clientRoles])];

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.preferred_username,
      firstName: payload.given_name,
      lastName: payload.family_name,
      roles,
    };
  }
}
