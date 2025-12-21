import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerFilterDto } from './dto/partner-filter.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/audit.decorator';
import { getClientIp, getUserAgent } from '../../common/utils/request.utils';

@ApiTags('Partners')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all partners with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Partners list returned' })
  async findAll(@Query() filterDto: PartnerFilterDto) {
    return this.partnersService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Partner returned' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.findOne(id);
  }

  @Post()
  @SkipAudit() // Audit wird im Service gehandhabt
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created' })
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.partnersService.create(createPartnerDto, {
      user,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Put(':id')
  @SkipAudit() // Audit wird im Service gehandhabt
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a partner' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Partner updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.partnersService.update(id, updatePartnerDto, {
      user,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Delete(':id')
  @SkipAudit() // Audit wird im Service gehandhabt
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Partner deleted' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.partnersService.remove(id, {
      user,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }
}
