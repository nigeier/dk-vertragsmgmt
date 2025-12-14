import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { Reminder, ContractStatus, Prisma } from '@prisma/client';

interface UpcomingDeadline {
  id: string;
  type: string;
  reminderDate: Date;
  message: string | null;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  partnerName: string;
  daysUntil: number;
}

@Injectable()
export class DeadlinesService {
  private readonly logger = new Logger(DeadlinesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get upcoming deadlines (reminders and contract expirations)
   */
  async getUpcoming(days: number, user: AuthenticatedUser): Promise<UpcomingDeadline[]> {
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let contractFilter: Prisma.ContractWhereInput = {
      status: ContractStatus.ACTIVE,
    };

    // Non-admin users can only see their own contracts
    if (!user.roles.includes('ADMIN')) {
      const dbUser = await this.getDbUser(user.id);
      contractFilter = {
        ...contractFilter,
        OR: [{ ownerId: dbUser.id }, { createdById: dbUser.id }],
      };
    }

    // Get unsent reminders within the date range
    const reminders = await this.prisma.reminder.findMany({
      where: {
        reminderDate: { gte: now, lte: targetDate },
        isSent: false,
        contract: contractFilter,
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            title: true,
            partner: { select: { name: true } },
          },
        },
      },
      orderBy: { reminderDate: 'asc' },
    });

    // Transform to unified format
    return reminders.map((reminder) => ({
      id: reminder.id,
      type: reminder.type,
      reminderDate: reminder.reminderDate,
      message: reminder.message,
      contractId: reminder.contract.id,
      contractNumber: reminder.contract.contractNumber,
      contractTitle: reminder.contract.title,
      partnerName: reminder.contract.partner.name,
      daysUntil: Math.ceil(
        (reminder.reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Get reminders for a specific contract
   */
  async getByContract(contractId: string, user: AuthenticatedUser): Promise<Reminder[]> {
    await this.verifyContractAccess(contractId, user);

    return this.prisma.reminder.findMany({
      where: { contractId },
      orderBy: { reminderDate: 'asc' },
    });
  }

  /**
   * Create a reminder
   */
  async create(dto: CreateReminderDto, user: AuthenticatedUser): Promise<Reminder> {
    await this.verifyContractAccess(dto.contractId, user);

    const reminder = await this.prisma.reminder.create({
      data: {
        type: dto.type,
        reminderDate: new Date(dto.reminderDate),
        message: dto.message,
        contractId: dto.contractId,
      },
    });

    this.logger.log(`Reminder ${reminder.id} created for contract ${dto.contractId}`);

    return reminder;
  }

  /**
   * Delete a reminder
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
      include: { contract: { select: { ownerId: true, createdById: true } } },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.verifyContractAccess(reminder.contractId, user);

    await this.prisma.reminder.delete({ where: { id } });

    this.logger.log(`Reminder ${id} deleted`);
  }

  /**
   * Auto-generate reminders for a contract based on its end date
   */
  async autoGenerateReminders(contractId: string, endDate: Date): Promise<void> {
    const reminderDays = [90, 60, 30, 14, 7]; // Days before end date

    const reminders = reminderDays
      .map((days) => {
        const reminderDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        if (reminderDate > new Date()) {
          return {
            type: 'EXPIRATION' as const,
            reminderDate,
            message: `Vertrag läuft in ${days} Tagen ab`,
            contractId,
          };
        }
        return null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (reminders.length > 0) {
      await this.prisma.reminder.createMany({
        data: reminders,
      });
    }
  }

  /**
   * Verify user has access to the contract
   */
  private async verifyContractAccess(
    contractId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { ownerId: true, createdById: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (user.roles.includes('ADMIN')) {
      return;
    }

    const dbUser = await this.getDbUser(user.id);

    if (contract.ownerId !== dbUser.id && contract.createdById !== dbUser.id) {
      throw new ForbiddenException('Access denied');
    }
  }

  /**
   * Get database user by Keycloak ID
   */
  private async getDbUser(keycloakId: string) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
