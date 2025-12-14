import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PartnersModule } from './modules/partners/partners.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DeadlinesModule } from './modules/deadlines/deadlines.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Core Modules
    PrismaModule,

    // Feature Modules
    AuthModule,
    ContractsModule,
    DocumentsModule,
    PartnersModule,
    UsersModule,
    AuditLogModule,
    NotificationsModule,
    DeadlinesModule,
  ],
  providers: [
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Audit Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
