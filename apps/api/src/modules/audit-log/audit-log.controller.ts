import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAudit, AuditLog } from '../../common/decorators/audit.decorator';
import { AuditAction } from '@prisma/client';

@ApiTags('Audit-Log')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
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

  @Get('stats')
  @SkipAudit()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({ status: 200, description: 'Audit log statistics returned' })
  async getStats(@Query('days') days: number = 30) {
    return this.auditLogService.getStats(days);
  }

  @Get('export')
  @Roles('ADMIN')
  @AuditLog({
    action: AuditAction.EXPORT,
    entityType: 'AuditLog',
    getEntityId: () => 'export',
  })
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Query() filterDto: AuditLogFilterDto, @Res() res: Response) {
    const csv = await this.auditLogService.exportCsv(filterDto);

    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
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
