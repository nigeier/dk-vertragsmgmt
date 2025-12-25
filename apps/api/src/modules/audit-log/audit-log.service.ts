import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { AuditLog, Prisma, AuditAction } from '@prisma/client';
import { PaginatedResult } from '@drykorn/shared';

export interface AuditLogWithUser extends AuditLog {
  user: { firstName: string; lastName: string; email: string };
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get audit logs with filtering and pagination
   */
  async findAll(filterDto: AuditLogFilterDto): Promise<PaginatedResult<AuditLogWithUser>> {
    const {
      page = 1,
      limit = 50,
      userId,
      entityType,
      action,
      contractId,
      dateFrom,
      dateTo,
    } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (action && action.length > 0) {
      where.action = { in: action };
    }

    if (contractId) {
      where.contractId = contractId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific contract
   */
  async findByContract(contractId: string): Promise<AuditLogWithUser[]> {
    return this.prisma.auditLog.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Create an audit log entry manually
   */
  async create(data: {
    action: Prisma.AuditLogCreateInput['action'];
    entityType: string;
    entityId: string;
    userId: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    contractId?: string;
    documentId?: string;
  }): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue
          ? (structuredClone(data.oldValue) as Prisma.InputJsonValue)
          : undefined,
        newValue: data.newValue
          ? (structuredClone(data.newValue) as Prisma.InputJsonValue)
          : undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        userId: data.userId,
        contractId: data.contractId,
        documentId: data.documentId,
      },
    });
  }

  /**
   * Export audit logs as CSV
   */
  async exportCsv(filterDto: AuditLogFilterDto): Promise<string> {
    const { userId, entityType, action, contractId, dateFrom, dateTo } = filterDto;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action && action.length > 0) where.action = { in: action };
    if (contractId) where.contractId = contractId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        contract: {
          select: { contractNumber: true, title: true },
        },
      },
      take: 10000, // Limit export to 10,000 entries
    });

    // Build CSV
    const headers = [
      'Zeitpunkt',
      'Benutzer',
      'E-Mail',
      'Aktion',
      'Objekttyp',
      'Objekt-ID',
      'Vertragsnummer',
      'Vertragstitel',
      'IP-Adresse',
      'Alte Werte',
      'Neue Werte',
    ];

    const actionLabels: Record<AuditAction, string> = {
      CREATE: 'Erstellt',
      READ: 'Gelesen',
      UPDATE: 'Aktualisiert',
      DELETE: 'Gelöscht',
      DOWNLOAD: 'Heruntergeladen',
      EXPORT: 'Exportiert',
    };

    const rows = logs.map((log) => [
      this.formatDateTime(log.createdAt),
      `${log.user.firstName} ${log.user.lastName}`,
      log.user.email,
      actionLabels[log.action] || log.action,
      log.entityType,
      log.entityId,
      log.contract?.contractNumber || '',
      log.contract?.title || '',
      log.ipAddress || '',
      log.oldValue ? JSON.stringify(log.oldValue) : '',
      log.newValue ? JSON.stringify(log.newValue) : '',
    ]);

    // Escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [headers.join(';'), ...rows.map((row) => row.map(escapeCSV).join(';'))].join(
      '\n',
    );

    // Add BOM for Excel UTF-8 compatibility
    return '\uFEFF' + csvContent;
  }

  /**
   * Get audit log statistics for dashboard
   */
  async getStats(days: number = 30): Promise<{
    totalActions: number;
    byAction: Record<AuditAction, number>;
    byEntityType: Record<string, number>;
    topUsers: Array<{ user: string; count: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalActions, byAction, byEntityType, topUsers] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where: { createdAt: { gte: since } },
        _count: { entityType: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    // Get user names for top users
    const userIds = topUsers.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    const actionCounts: Record<AuditAction, number> = {
      CREATE: 0,
      READ: 0,
      UPDATE: 0,
      DELETE: 0,
      DOWNLOAD: 0,
      EXPORT: 0,
    };
    byAction.forEach((item) => {
      actionCounts[item.action] = item._count.action;
    });

    const entityCounts: Record<string, number> = {};
    byEntityType.forEach((item) => {
      entityCounts[item.entityType] = item._count.entityType;
    });

    return {
      totalActions,
      byAction: actionCounts,
      byEntityType: entityCounts,
      topUsers: topUsers.map((u) => ({
        user: userMap.get(u.userId) || 'Unbekannt',
        count: u._count.userId,
      })),
    };
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
