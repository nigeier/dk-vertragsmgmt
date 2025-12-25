import { Injectable, NotFoundException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractFilterDto } from './dto/contract-filter.dto';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { Contract, ContractStatus, ContractType, Prisma, AuditAction } from '@prisma/client';
import { getClientIp, getUserAgent } from '../../common/utils/request.utils';
import { PaginatedResult } from '@drykorn/shared';

export interface ContractWithRelations extends Contract {
  partner: { id: string; name: string };
  owner: { id: string; firstName: string; lastName: string };
  _count: { documents: number };
}

export interface ContractStats {
  total: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  totalValue: number;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * Get all contracts with filtering and pagination
   */
  async findAll(
    filterDto: ContractFilterDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<ContractWithRelations>> {
    const { page = 1, limit = 20, search, status, type, partnerId, sortBy, sortOrder } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ContractWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    if (partnerId) {
      where.partnerId = partnerId;
    }

    // Non-admin users can only see their own contracts or contracts they own
    if (!user.roles.includes('ADMIN')) {
      where.OR = [{ ownerId: user.id }, { createdById: user.id }];
    }

    // Build orderBy
    let orderBy: Prisma.ContractOrderByWithRelationInput = { createdAt: 'desc' };
    if (
      sortBy &&
      [
        'title',
        'createdAt',
        'updatedAt',
        'startDate',
        'endDate',
        'value',
        'contractNumber',
      ].includes(sortBy)
    ) {
      orderBy = { [sortBy]: sortOrder || 'desc' } as Prisma.ContractOrderByWithRelationInput;
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          partner: {
            select: { id: true, name: true },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { documents: true },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contract by ID
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<ContractWithRelations> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        reminders: {
          orderBy: { reminderDate: 'asc' },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Vertrag nicht gefunden');
    }

    // Check access for non-admin users
    if (!user.roles.includes('ADMIN')) {
      if (contract.ownerId !== user.id && contract.createdById !== user.id) {
        throw new ForbiddenException('Zugriff verweigert');
      }
    }

    return contract as ContractWithRelations;
  }

  /**
   * Create a new contract
   */
  async create(dto: CreateContractDto, user: AuthenticatedUser): Promise<Contract> {
    // Verify partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Partner nicht gefunden');
    }

    // Generate contract number
    const contractNumber = await this.generateContractNumber();

    const contract = await this.prisma.contract.create({
      data: {
        contractNumber,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status || ContractStatus.DRAFT,
        startDate: dto.startDate,
        endDate: dto.endDate,
        noticePeriodDays: dto.noticePeriodDays,
        autoRenewal: dto.autoRenewal || false,
        value: dto.value,
        currency: dto.currency || 'EUR',
        paymentTerms: dto.paymentTerms,
        tags: dto.tags || [],
        customFields: dto.customFields
          ? (structuredClone(dto.customFields) as Prisma.InputJsonValue)
          : undefined,
        partnerId: dto.partnerId,
        ownerId: dto.ownerId || user.id,
        createdById: user.id,
      },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Contract ${contractNumber} created by ${user.email}`);

    return contract;
  }

  /**
   * Update a contract
   */
  async update(id: string, dto: UpdateContractDto, user: AuthenticatedUser): Promise<Contract> {
    const existing = await this.findOne(id, user);

    // Capture old values for audit log
    const oldValue = {
      title: existing.title,
      description: existing.description,
      type: existing.type,
      status: existing.status,
      startDate: existing.startDate,
      endDate: existing.endDate,
      noticePeriodDays: existing.noticePeriodDays,
      autoRenewal: existing.autoRenewal,
      value: existing.value,
      currency: existing.currency,
      paymentTerms: existing.paymentTerms,
      tags: existing.tags,
      partnerId: existing.partnerId,
      ownerId: existing.ownerId,
    };

    // Prevent updates to certain fields based on status
    if (
      existing.status === ContractStatus.ACTIVE &&
      dto.status &&
      dto.status !== ContractStatus.ACTIVE &&
      dto.status !== ContractStatus.TERMINATED
    ) {
      throw new ForbiddenException('Aktive Verträge können nur gekündigt werden');
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        startDate: dto.startDate,
        endDate: dto.endDate,
        noticePeriodDays: dto.noticePeriodDays,
        autoRenewal: dto.autoRenewal,
        value: dto.value,
        currency: dto.currency,
        paymentTerms: dto.paymentTerms,
        tags: dto.tags,
        customFields: dto.customFields
          ? (structuredClone(dto.customFields) as Prisma.InputJsonValue)
          : undefined,
        partnerId: dto.partnerId,
        ownerId: dto.ownerId,
      },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Audit log with old and new values
    await this.auditLogService.create({
      action: AuditAction.UPDATE,
      entityType: 'Contract',
      entityId: id,
      userId: user.id,
      oldValue,
      newValue: dto as Record<string, unknown>,
      ipAddress: getClientIp(this.request),
      userAgent: getUserAgent(this.request),
      contractId: id,
    });

    this.logger.log(`Contract ${id} updated by ${user.email}`);

    return updated;
  }

  /**
   * Update contract status
   */
  async updateStatus(
    id: string,
    status: ContractStatus,
    user: AuthenticatedUser,
  ): Promise<Contract> {
    const existing = await this.findOne(id, user);
    const oldStatus = existing.status;

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Audit log for status change
    await this.auditLogService.create({
      action: AuditAction.UPDATE,
      entityType: 'Contract',
      entityId: id,
      userId: user.id,
      oldValue: { status: oldStatus },
      newValue: { status },
      ipAddress: getClientIp(this.request),
      userAgent: getUserAgent(this.request),
      contractId: id,
    });

    this.logger.log(`Contract ${id} status changed to ${status} by ${user.email}`);

    return updated;
  }

  /**
   * Assign contract to a different user
   */
  async assign(
    id: string,
    newOwnerId: string,
    user: AuthenticatedUser,
    reason?: string,
  ): Promise<Contract> {
    // Only ADMIN and MANAGER can assign contracts
    if (!user.roles.includes('ADMIN') && !user.roles.includes('MANAGER')) {
      throw new ForbiddenException('Nur Administratoren und Manager können Verträge zuweisen');
    }

    const existing = await this.findOne(id, user);
    const oldOwnerId = existing.ownerId;

    // Verify the new owner exists and is active
    const newOwner = await this.prisma.user.findUnique({
      where: { id: newOwnerId },
      select: { id: true, isActive: true, status: true, firstName: true, lastName: true },
    });

    if (!newOwner) {
      throw new NotFoundException('Zielbenutzer nicht gefunden');
    }

    if (!newOwner.isActive || newOwner.status !== 'ACTIVE') {
      throw new ForbiddenException('Zielbenutzer ist nicht aktiv');
    }

    // No change needed
    if (oldOwnerId === newOwnerId) {
      return existing;
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { ownerId: newOwnerId },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Audit log for assignment
    await this.auditLogService.create({
      action: AuditAction.UPDATE,
      entityType: 'Contract',
      entityId: id,
      userId: user.id,
      oldValue: {
        ownerId: oldOwnerId,
        action: 'assignment',
      },
      newValue: {
        ownerId: newOwnerId,
        ownerName: `${newOwner.firstName} ${newOwner.lastName}`,
        reason: reason || undefined,
        action: 'assignment',
      },
      ipAddress: getClientIp(this.request),
      userAgent: getUserAgent(this.request),
      contractId: id,
    });

    this.logger.log(
      `Contract ${id} assigned to ${newOwner.firstName} ${newOwner.lastName} by ${user.email}` +
        (reason ? ` (Grund: ${reason})` : ''),
    );

    return updated;
  }

  /**
   * Delete a contract
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const contract = await this.findOne(id, user);

    // Only allow deletion of drafts
    if (contract.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException('Nur Entwürfe können gelöscht werden');
    }

    // Capture contract data for audit log before deletion
    const oldValue = {
      contractNumber: contract.contractNumber,
      title: contract.title,
      type: contract.type,
      status: contract.status,
      partnerId: contract.partnerId,
      value: contract.value,
    };

    await this.prisma.contract.delete({ where: { id } });

    // Audit log for deletion
    await this.auditLogService.create({
      action: AuditAction.DELETE,
      entityType: 'Contract',
      entityId: id,
      userId: user.id,
      oldValue,
      ipAddress: getClientIp(this.request),
      userAgent: getUserAgent(this.request),
    });

    this.logger.log(`Contract ${id} deleted by ${user.email}`);
  }

  /**
   * Get contract statistics
   */
  async getStats(user: AuthenticatedUser): Promise<ContractStats> {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Build base where clause based on user access
    let where: Prisma.ContractWhereInput = {};
    if (!user.roles.includes('ADMIN')) {
      where = {
        OR: [{ ownerId: user.id }, { createdById: user.id }],
      };
    }

    const [
      total,
      byStatus,
      byType,
      expiringIn30Days,
      expiringIn60Days,
      expiringIn90Days,
      valueSum,
    ] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.contract.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
      this.prisma.contract.count({
        where: {
          ...where,
          status: ContractStatus.ACTIVE,
          endDate: { lte: in30Days, gte: now },
        },
      }),
      this.prisma.contract.count({
        where: {
          ...where,
          status: ContractStatus.ACTIVE,
          endDate: { lte: in60Days, gte: now },
        },
      }),
      this.prisma.contract.count({
        where: {
          ...where,
          status: ContractStatus.ACTIVE,
          endDate: { lte: in90Days, gte: now },
        },
      }),
      this.prisma.contract.aggregate({
        where: { ...where, status: ContractStatus.ACTIVE },
        _sum: { value: true },
      }),
    ]);

    const statusCounts: Record<ContractStatus, number> = {
      [ContractStatus.DRAFT]: 0,
      [ContractStatus.PENDING_APPROVAL]: 0,
      [ContractStatus.ACTIVE]: 0,
      [ContractStatus.EXPIRED]: 0,
      [ContractStatus.TERMINATED]: 0,
      [ContractStatus.ARCHIVED]: 0,
    };

    byStatus.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    const typeCounts: Record<ContractType, number> = {
      [ContractType.SUPPLIER]: 0,
      [ContractType.CUSTOMER]: 0,
      [ContractType.EMPLOYMENT]: 0,
      [ContractType.SERVICE]: 0,
      [ContractType.LEASE]: 0,
      [ContractType.LICENSE]: 0,
      [ContractType.NDA]: 0,
      [ContractType.OTHER]: 0,
    };

    byType.forEach((item) => {
      typeCounts[item.type] = item._count.type;
    });

    return {
      total,
      byStatus: statusCounts,
      byType: typeCounts,
      expiringIn30Days,
      expiringIn60Days,
      expiringIn90Days,
      totalValue: Number(valueSum._sum.value || 0),
    };
  }

  /**
   * Get contracts expiring within specified days
   */
  async getExpiring(days: number, user: AuthenticatedUser) {
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let where: Prisma.ContractWhereInput = {
      status: ContractStatus.ACTIVE,
      endDate: { lte: targetDate, gte: now },
    };

    if (!user.roles.includes('ADMIN')) {
      where = {
        ...where,
        OR: [{ ownerId: user.id }, { createdById: user.id }],
      };
    }

    return this.prisma.contract.findMany({
      where,
      orderBy: { endDate: 'asc' },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Generate unique contract number
   */
  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Use transaction to ensure unique sequence
    const result = await this.prisma.$transaction(async (tx) => {
      const sequence = await tx.contractSequence.upsert({
        where: { year },
        update: { lastValue: { increment: 1 } },
        create: { year, lastValue: 1 },
      });

      return `DK-${year}-${String(sequence.lastValue).padStart(5, '0')}`;
    });

    return result;
  }
}
