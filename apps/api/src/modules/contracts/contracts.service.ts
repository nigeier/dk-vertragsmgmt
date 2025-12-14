import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractFilterDto } from './dto/contract-filter.dto';
import { AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { Contract, ContractStatus, Prisma } from '@prisma/client';

interface ContractWithRelations extends Contract {
  partner: { id: string; name: string };
  owner: { id: string; firstName: string; lastName: string };
  _count: { documents: number };
}

interface ContractStats {
  total: number;
  byStatus: Record<ContractStatus, number>;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  totalValue: number;
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
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      const dbUser = await this.getUserByKeycloakId(user.id);
      where.OR = [
        { ownerId: dbUser.id },
        { createdById: dbUser.id },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.ContractOrderByWithRelationInput = {};
    if (sortBy) {
      orderBy[sortBy as keyof Prisma.ContractOrderByWithRelationInput] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
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
      throw new NotFoundException('Contract not found');
    }

    // Check access for non-admin users
    if (!user.roles.includes('ADMIN')) {
      const dbUser = await this.getUserByKeycloakId(user.id);
      if (contract.ownerId !== dbUser.id && contract.createdById !== dbUser.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    return contract as ContractWithRelations;
  }

  /**
   * Create a new contract
   */
  async create(dto: CreateContractDto, user: AuthenticatedUser): Promise<Contract> {
    const dbUser = await this.getUserByKeycloakId(user.id);

    // Verify partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
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
        customFields: dto.customFields,
        partnerId: dto.partnerId,
        ownerId: dto.ownerId || dbUser.id,
        createdById: dbUser.id,
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

    // Prevent updates to certain fields based on status
    if (
      existing.status === ContractStatus.ACTIVE &&
      dto.status &&
      dto.status !== ContractStatus.ACTIVE &&
      dto.status !== ContractStatus.TERMINATED
    ) {
      throw new ForbiddenException('Active contracts can only be terminated');
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
        customFields: dto.customFields,
        partnerId: dto.partnerId,
        ownerId: dto.ownerId,
      },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
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
    await this.findOne(id, user);

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status },
      include: {
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Contract ${id} status changed to ${status} by ${user.email}`);

    return updated;
  }

  /**
   * Delete a contract
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const contract = await this.findOne(id, user);

    // Only allow deletion of drafts
    if (contract.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException('Only draft contracts can be deleted');
    }

    await this.prisma.contract.delete({ where: { id } });

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
      const dbUser = await this.getUserByKeycloakId(user.id);
      where = {
        OR: [{ ownerId: dbUser.id }, { createdById: dbUser.id }],
      };
    }

    const [
      total,
      byStatus,
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

    return {
      total,
      byStatus: statusCounts,
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
      const dbUser = await this.getUserByKeycloakId(user.id);
      where = {
        ...where,
        OR: [{ ownerId: dbUser.id }, { createdById: dbUser.id }],
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

  /**
   * Get user by Keycloak ID
   */
  private async getUserByKeycloakId(keycloakId: string) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
