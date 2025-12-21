import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { User, Prisma, AuditAction, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';

export interface UserWithStats extends User {
  _count: { contracts: number; createdContracts: number };
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
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get all users with filtering and pagination
   */
  async findAll(filterDto: UserFilterDto): Promise<PaginatedResult<UserWithStats>> {
    const { page = 1, limit = 20, search, isActive, department } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (department) {
      where.department = department;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          _count: {
            select: { contracts: true, createdContracts: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string): Promise<UserWithStats> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contracts: true, createdContracts: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    return user;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Get active users for dropdowns (lightweight)
   */
  async findActiveForDropdown(): Promise<
    { id: string; firstName: string; lastName: string; email: string; role: string }[]
  > {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  /**
   * Update user
   */
  async update(id: string, dto: UpdateUserDto, audit: AuditContext): Promise<User> {
    const existing = await this.findOne(id);

    // Capture old values for audit
    const oldValue = {
      firstName: existing.firstName,
      lastName: existing.lastName,
      department: existing.department,
      role: existing.role,
    };

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        department: dto.department,
        role: dto.role as UserRole | undefined,
      },
    });

    // Audit Log with old and new values
    await this.auditLogService.create({
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      userId: audit.user.id,
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    this.logger.log(`User ${id} updated by ${audit.user.email}`);

    return user;
  }

  /**
   * Set user active status
   */
  async setActive(id: string, isActive: boolean, audit: AuditContext): Promise<User> {
    const targetUser = await this.findOne(id);

    // Prevent self-deactivation
    if (id === audit.user.id && !isActive) {
      throw new ForbiddenException('Sie können sich nicht selbst deaktivieren');
    }

    // Prevent deactivating the last admin
    if (!isActive && targetUser.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Der letzte Administrator kann nicht deaktiviert werden');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    // Audit Log
    await this.auditLogService.create({
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      userId: audit.user.id,
      oldValue: { isActive: targetUser.isActive },
      newValue: { isActive },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    this.logger.log(`User ${id} ${isActive ? 'activated' : 'deactivated'} by ${audit.user.email}`);

    return user;
  }
}
