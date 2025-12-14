/**
 * Audit-related types shared between frontend and backend
 */

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  DOWNLOAD = 'DOWNLOAD',
  EXPORT = 'EXPORT',
}

export enum EntityType {
  CONTRACT = 'Contract',
  DOCUMENT = 'Document',
  PARTNER = 'Partner',
  USER = 'User',
  REMINDER = 'Reminder',
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  userId: string;
  contractId?: string;
  documentId?: string;
  createdAt: Date;
}

export interface AuditLogListItem {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userName: string;
  contractNumber?: string;
  documentName?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface AuditLogFilter {
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  action?: AuditAction[];
  contractId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.CREATE]: 'Erstellt',
  [AuditAction.READ]: 'Gelesen',
  [AuditAction.UPDATE]: 'Aktualisiert',
  [AuditAction.DELETE]: 'Gelöscht',
  [AuditAction.DOWNLOAD]: 'Heruntergeladen',
  [AuditAction.EXPORT]: 'Exportiert',
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.CONTRACT]: 'Vertrag',
  [EntityType.DOCUMENT]: 'Dokument',
  [EntityType.PARTNER]: 'Partner',
  [EntityType.USER]: 'Benutzer',
  [EntityType.REMINDER]: 'Erinnerung',
};
