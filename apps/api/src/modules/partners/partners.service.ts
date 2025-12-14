import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerFilterDto } from './dto/partner-filter.dto';
import { Partner, Prisma } from '@prisma/client';

interface PartnerWithContracts extends Partner {
  _count: { contracts: number };
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
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    const orderBy: Prisma.PartnerOrderByWithRelationInput = {};
    if (sortBy) {
      orderBy[sortBy as keyof Prisma.PartnerOrderByWithRelationInput] = sortOrder || 'asc';
    } else {
      orderBy.name = 'asc';
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
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  /**
   * Create a new partner
   */
  async create(dto: CreatePartnerDto): Promise<Partner> {
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

    this.logger.log(`Partner ${partner.id} created: ${partner.name}`);

    return partner;
  }

  /**
   * Update a partner
   */
  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    await this.findOne(id);

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

    this.logger.log(`Partner ${id} updated`);

    return partner;
  }

  /**
   * Delete a partner
   */
  async remove(id: string): Promise<void> {
    const partner = await this.findOne(id);

    // Check if partner has contracts
    if (partner._count.contracts > 0) {
      throw new ConflictException('Cannot delete partner with existing contracts');
    }

    await this.prisma.partner.delete({ where: { id } });

    this.logger.log(`Partner ${id} deleted`);
  }
}
