import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAudit } from '../../common/decorators/audit.decorator';

@ApiTags('audit-log')
@ApiBearerAuth('access-token')
@UseGuards(KeycloakAuthGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @SkipAudit()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  async findAll(@Query() filterDto: AuditLogFilterDto) {
    return this.auditLogService.findAll(filterDto);
  }

  @Get('contract/:contractId')
  @SkipAudit()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get audit logs for a specific contract' })
  @ApiResponse({ status: 200, description: 'Audit logs for contract returned' })
  async findByContract(@Query('contractId') contractId: string) {
    return this.auditLogService.findByContract(contractId);
  }
}
