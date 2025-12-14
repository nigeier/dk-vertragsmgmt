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
import { ContractFilterDto } from './dto/contract-filter.dto';
import { KeycloakAuthGuard, AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditCreate, AuditUpdate, AuditDelete, AuditRead } from '../../common/decorators/audit.decorator';
import { ContractStatus } from '@prisma/client';

@ApiTags('contracts')
@ApiBearerAuth('access-token')
@UseGuards(KeycloakAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contracts with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Contracts list returned' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query() filterDto: ContractFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
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
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days until expiration (default: 30)' })
  @ApiResponse({ status: 200, description: 'Expiring contracts returned' })
  async getExpiring(
    @Query('days') days: number = 30,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.getExpiring(days, user);
  }

  @Get(':id')
  @AuditRead('Contract')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract returned' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
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
  @AuditUpdate('Contract')
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
  @AuditUpdate('Contract')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update contract status' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contract status updated' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ContractStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.updateStatus(id, status, user);
  }

  @Delete(':id')
  @AuditDelete('Contract')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a contract' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Contract deleted' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.contractsService.remove(id, user);
  }
}
