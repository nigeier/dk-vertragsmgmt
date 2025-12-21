import { Module, Scope } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [ContractsController],
  providers: [
    {
      provide: ContractsService,
      useClass: ContractsService,
      scope: Scope.REQUEST,
    },
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
