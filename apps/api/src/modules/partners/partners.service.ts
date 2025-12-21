import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerFilterDto } from './dto/partner-filter.dto';
import { Partner, Prisma, AuditAction } from '@prisma/client';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';

export interface PartnerWithContracts extends Partner {
  _count: { contracts: number };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditContext {
  user: AuthenticatedUser;
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get all partners with filtering and pagination
   */
  async findAll(filterDto: PartnerFilterDto): Promise<PaginatedResult<PartnerWithContracts>> {
    const { page = 1, limit = 20, search, type, isActive, sortBy, sortOrder } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.PartnerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    let orderBy: Prisma.PartnerOrderByWithRelationInput = { name: 'asc' };
    if (sortBy && ['name', 'type', 'createdAt', 'updatedAt'].includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder || 'asc' } as Prisma.PartnerOrderByWithRelationInput;
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { contracts: true } },
        },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data: partners,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get partner by ID
   */
  async findOne(id: string): Promise<PartnerWithContracts> {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        _count: { select: { contracts: true } },
        contracts: {
          select: {
            id: true,
            contractNumber: true,
            title: true,
            status: true,
            endDate: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner nicht gefunden');
    }

    return partner;
  }

  /**
   * Create a new partner
   */
  async create(dto: CreatePartnerDto, audit: AuditContext): Promise<Partner> {
    const partner = await this.prisma.partner.create({
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        contactPerson: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        taxId: dto.taxId,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });

    // Audit Log
    await this.auditLogService.create({
      action: AuditAction.CREATE,
      entityType: 'Partner',
      entityId: partner.id,
      userId: audit.user.id,
      newValue: dto as unknown as Record<string, unknown>,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    this.logger.log(`Partner ${partner.id} created: ${partner.name}`);

    return partner;
  }

  /**
   * Update a partner
   */
  async update(id: string, dto: UpdatePartnerDto, audit: AuditContext): Promise<Partner> {
    const existing = await this.findOne(id);

    // Capture old values for audit
    const oldValue = {
      name: existing.name,
      type: existing.type,
      address: existing.address,
      contactPerson: existing.contactPerson,
      email: existing.email,
      phone: existing.phone,
      taxId: existing.taxId,
      notes: existing.notes,
      isActive: existing.isActive,
    };

    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        contactPerson: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        taxId: dto.taxId,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });

    // Audit Log with old and new values
    await this.auditLogService.create({
      action: AuditAction.UPDATE,
      entityType: 'Partner',
      entityId: id,
      userId: audit.user.id,
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    this.logger.log(`Partner ${id} updated`);

    return partner;
  }

  /**
   * Delete a partner
   */
  async remove(id: string, audit: AuditContext): Promise<void> {
    const partner = await this.findOne(id);

    // Check if partner has contracts
    if (partner._count.contracts > 0) {
      throw new ConflictException('Cannot delete partner with existing contracts');
    }

    // Capture for audit before delete
    const oldValue = {
      name: partner.name,
      type: partner.type,
      email: partner.email,
    };

    await this.prisma.partner.delete({ where: { id } });

    // Audit Log
    await this.auditLogService.create({
      action: AuditAction.DELETE,
      entityType: 'Partner',
      entityId: id,
      userId: audit.user.id,
      oldValue,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    this.logger.log(`Partner ${id} deleted`);
  }
}
