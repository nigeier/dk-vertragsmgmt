import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Reminder, ContractStatus, Prisma } from '@prisma/client';

export interface UpcomingDeadline {
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
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * Scheduled job: Send reminder emails every day at 8:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendScheduledReminders(): Promise<void> {
    this.logger.log('Running scheduled reminder job...');

    try {
      const now = new Date();

      // Find all unsent reminders that are due today or overdue
      const dueReminders = await this.prisma.reminder.findMany({
        where: {
          reminderDate: { lte: now },
          isSent: false,
          contract: {
            status: ContractStatus.ACTIVE,
          },
        },
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              title: true,
              endDate: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              partner: {
                select: { name: true },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${dueReminders.length} due reminders`);

      // Sammle IDs der erfolgreich versendeten Reminders
      const sentReminderIds: string[] = [];

      // Sende Emails parallel für bessere Performance
      const emailPromises = dueReminders.map(async (reminder) => {
        const owner = reminder.contract.owner;
        if (!owner?.email) {
          this.logger.warn(`No owner email for contract ${reminder.contract.id}`);
          return;
        }

        try {
          const daysUntilExpiration = reminder.contract.endDate
            ? Math.ceil(
                (reminder.contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
              )
            : 0;

          await this.emailService.sendContractExpirationReminder({
            to: owner.email,
            userName: `${owner.firstName} ${owner.lastName}`,
            contractTitle: reminder.contract.title,
            contractNumber: reminder.contract.contractNumber,
            expirationDate: reminder.contract.endDate || new Date(),
            daysUntilExpiration,
            contractUrl: `${this.frontendUrl}/contracts/${reminder.contract.id}`,
          });

          sentReminderIds.push(reminder.id);
          this.logger.log(`Reminder email sent for contract ${reminder.contract.contractNumber}`);
        } catch (error) {
          this.logger.error(`Failed to send reminder for ${reminder.id}: ${String(error)}`);
        }
      });

      await Promise.all(emailPromises);

      // Batch-Update: Alle erfolgreichen Reminders auf einmal markieren
      if (sentReminderIds.length > 0) {
        await this.prisma.reminder.updateMany({
          where: { id: { in: sentReminderIds } },
          data: { isSent: true },
        });
        this.logger.log(`${sentReminderIds.length} reminders marked as sent`);
      }

      this.logger.log('Scheduled reminder job completed');
    } catch (error) {
      this.logger.error('Scheduled reminder job failed', error);
    }
  }

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
      contractFilter = {
        ...contractFilter,
        OR: [{ ownerId: user.id }, { createdById: user.id }],
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
      throw new NotFoundException('Erinnerung nicht gefunden');
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
  private async verifyContractAccess(contractId: string, user: AuthenticatedUser): Promise<void> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { ownerId: true, createdById: true },
    });

    if (!contract) {
      throw new NotFoundException('Vertrag nicht gefunden');
    }

    if (user.roles.includes('ADMIN')) {
      return;
    }

    if (contract.ownerId !== user.id && contract.createdById !== user.id) {
      throw new ForbiddenException('Zugriff verweigert');
    }
  }
}
