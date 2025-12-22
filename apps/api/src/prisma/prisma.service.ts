import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error - Prisma event typing
      this.$on('query', (e: { query: string; params: string; duration: number }) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }

    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Clean database for testing purposes only
   * NEVER use in production!
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase cannot be used in production!');
    }

    // Sichere Variante: Tabellen einzeln über Prisma Models löschen
    // Reihenfolge beachten wegen Foreign Keys (abhängige zuerst)
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const prisma = this as any;
    await this.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.deadline.deleteMany(),
      prisma.document.deleteMany(),
      prisma.contract.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.partner.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    this.logger.log('Database cleaned successfully');
  }
}
