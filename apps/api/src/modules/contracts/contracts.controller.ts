import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { AssignContractDto } from './dto/assign-contract.dto';
import { ContractFilterDto } from './dto/contract-filter.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditCreate, AuditRead, SkipAudit } from '../../common/decorators/audit.decorator';

@ApiTags('Contracts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contracts with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Contracts list returned' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() filterDto: ContractFilterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.findAll(filterDto, user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contract statistics' })
  @ApiResponse({ status: 200, description: 'Contract statistics returned' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.getStats(user);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get contracts expiring within specified days' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Days until expiration (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Expiring contracts returned' })
  async getExpiring(@Query('days') days: number = 30, @CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.getExpiring(days, user);
  }

  @Get(':id')
  @AuditRead('Contract')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract returned' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.findOne(id, user);
  }

  @Post()
  @AuditCreate('Contract')
  @Roles('ADMIN', 'MANAGER', 'USER')
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Body() createContractDto: CreateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.create(createContractDto, user);
  }

  @Put(':id')
  @SkipAudit() // Audit handled in service with oldValue capture
  @Roles('ADMIN', 'MANAGER', 'USER')
  @ApiOperation({ summary: 'Update a contract' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract updated' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.update(id, updateContractDto, user);
  }

  @Patch(':id/status')
  @SkipAudit() // Audit handled in service with oldValue capture
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update contract status' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract status updated' })
  @ApiResponse({ status: 400, description: 'Ungültiger Status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.updateStatus(id, dto.status, user);
  }

  @Patch(':id/assign')
  @SkipAudit() // Audit handled in service
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign contract to a different user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Vertrag zugewiesen' })
  @ApiResponse({ status: 403, description: 'Keine Berechtigung' })
  @ApiResponse({ status: 404, description: 'Vertrag oder Benutzer nicht gefunden' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.assign(id, dto.ownerId, user, dto.reason);
  }

  @Delete(':id')
  @SkipAudit() // Audit handled in service with oldValue capture
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a contract' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Contract deleted' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.contractsService.remove(id, user);
  }
}
