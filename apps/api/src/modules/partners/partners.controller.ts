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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerFilterDto } from './dto/partner-filter.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditCreate, AuditUpdate, AuditDelete } from '../../common/decorators/audit.decorator';

@ApiTags('partners')
@ApiBearerAuth('access-token')
@UseGuards(KeycloakAuthGuard)
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
  @AuditCreate('Partner')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created' })
  async create(@Body() createPartnerDto: CreatePartnerDto) {
    return this.partnersService.create(createPartnerDto);
  }

  @Put(':id')
  @AuditUpdate('Partner')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a partner' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Partner updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnersService.update(id, updatePartnerDto);
  }

  @Delete(':id')
  @AuditDelete('Partner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Partner deleted' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.partnersService.remove(id);
  }
}
