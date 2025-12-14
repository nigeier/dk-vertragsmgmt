import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../guards/keycloak-auth.guard';
import { AuditAction } from '@prisma/client';

export const AUDIT_LOG_KEY = 'auditLog';
export const SKIP_AUDIT_KEY = 'skipAudit';

export interface AuditLogMetadata {
  action: AuditAction;
  entityType: string;
  getEntityId?: (request: Request, response: unknown) => string;
  getOldValue?: (request: Request) => Record<string, unknown>;
  getNewValue?: (request: Request, response: unknown) => Record<string, unknown>;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipAudit = this.reflector.get<boolean>(SKIP_AUDIT_KEY, context.getHandler());
    if (skipAudit) {
      return next.handle();
    }

    const auditMetadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      // Skip audit if no user (shouldn't happen for protected routes)
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (response: unknown) => {
          try {
            await this.createAuditLog(request, response, user, auditMetadata);
          } catch (error) {
            this.logger.error('Failed to create audit log', error);
          }
        },
      }),
    );
  }

  private async createAuditLog(
    request: Request,
    response: unknown,
    user: AuthenticatedUser,
    metadata: AuditLogMetadata,
  ): Promise<void> {
    const entityId = metadata.getEntityId
      ? metadata.getEntityId(request, response)
      : (request.params.id as string);

    if (!entityId) {
      return;
    }

    // Get user from database by keycloak ID
    const dbUser = await this.prisma.user.findUnique({
      where: { keycloakId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      this.logger.warn(`User not found in database: ${user.id}`);
      return;
    }

    const oldValue = metadata.getOldValue ? metadata.getOldValue(request) : undefined;
    const newValue = metadata.getNewValue ? metadata.getNewValue(request, response) : undefined;

    await this.prisma.auditLog.create({
      data: {
        action: metadata.action,
        entityType: metadata.entityType,
        entityId,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'] || undefined,
        userId: dbUser.id,
        contractId: metadata.entityType === 'Contract' ? entityId : undefined,
        documentId: metadata.entityType === 'Document' ? entityId : undefined,
      },
    });
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
