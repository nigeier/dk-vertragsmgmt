import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { User, Prisma } from '@prisma/client';

interface UserWithStats extends User {
  _count: { contracts: number; createdContracts: number };
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
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user by Keycloak ID
   */
  async findByKeycloakId(keycloakId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { keycloakId },
    });
  }

  /**
   * Update user
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        department: dto.department,
      },
    });

    this.logger.log(`User ${id} updated`);

    return user;
  }

  /**
   * Set user active status
   */
  async setActive(id: string, isActive: boolean): Promise<User> {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    this.logger.log(`User ${id} ${isActive ? 'activated' : 'deactivated'}`);

    return user;
  }

  /**
   * Sync user from Keycloak
   */
  async syncFromKeycloak(keycloakUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { keycloakId: keycloakUser.id },
    });

    if (existingUser) {
      return this.prisma.user.update({
        where: { keycloakId: keycloakUser.id },
        data: {
          email: keycloakUser.email,
          firstName: keycloakUser.firstName,
          lastName: keycloakUser.lastName,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        keycloakId: keycloakUser.id,
        email: keycloakUser.email,
        firstName: keycloakUser.firstName,
        lastName: keycloakUser.lastName,
        isActive: true,
      },
    });
  }
}
