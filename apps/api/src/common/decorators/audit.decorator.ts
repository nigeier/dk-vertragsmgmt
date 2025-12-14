import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';
import { AUDIT_LOG_KEY, SKIP_AUDIT_KEY, AuditLogMetadata } from '../interceptors/audit-log.interceptor';

/**
 * Mark a route for audit logging
 */
export const AuditLog = (metadata: AuditLogMetadata): ReturnType<typeof SetMetadata> =>
  SetMetadata(AUDIT_LOG_KEY, metadata);

/**
 * Skip audit logging for a route
 */
export const SkipAudit = (): ReturnType<typeof SetMetadata> => SetMetadata(SKIP_AUDIT_KEY, true);

/**
 * Helper to create audit log for CREATE action
 */
export const AuditCreate = (entityType: string): ReturnType<typeof SetMetadata> =>
  AuditLog({
    action: AuditAction.CREATE,
    entityType,
    getEntityId: (_req: Request, res: unknown) => (res as { id: string })?.id,
    getNewValue: (req: Request) => req.body as Record<string, unknown>,
  });

/**
 * Helper to create audit log for UPDATE action
 */
export const AuditUpdate = (entityType: string): ReturnType<typeof SetMetadata> =>
  AuditLog({
    action: AuditAction.UPDATE,
    entityType,
    getNewValue: (req: Request) => req.body as Record<string, unknown>,
  });

/**
 * Helper to create audit log for DELETE action
 */
export const AuditDelete = (entityType: string): ReturnType<typeof SetMetadata> =>
  AuditLog({
    action: AuditAction.DELETE,
    entityType,
  });

/**
 * Helper to create audit log for READ action
 */
export const AuditRead = (entityType: string): ReturnType<typeof SetMetadata> =>
  AuditLog({
    action: AuditAction.READ,
    entityType,
  });

/**
 * Helper to create audit log for DOWNLOAD action
 */
export const AuditDownload = (entityType: string): ReturnType<typeof SetMetadata> =>
  AuditLog({
    action: AuditAction.DOWNLOAD,
    entityType,
  });
