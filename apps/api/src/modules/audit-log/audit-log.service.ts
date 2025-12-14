import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { AuditLog, Prisma } from '@prisma/client';

interface AuditLogWithUser extends AuditLog {
  user: { firstName: string; lastName: string; email: string };
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        userId: data.userId,
        contractId: data.contractId,
        documentId: data.documentId,
      },
    });
  }
}
