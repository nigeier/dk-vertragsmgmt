import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAudit } from '../../common/decorators/audit.decorator';
import { getClientIp, getUserAgent } from '../../common/utils/request.utils';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users list returned' })
  async findAll(@Query() filterDto: UserFilterDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get('active/list')
  @SkipAudit()
  @ApiOperation({ summary: 'Get active users for dropdowns (lightweight)' })
  @ApiResponse({ status: 200, description: 'Active users list returned' })
  async findActiveForDropdown() {
    return this.usersService.findActiveForDropdown();
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @SkipAudit() // Audit wird im Service gehandhabt
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, updateUserDto, {
      user,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Patch(':id/deactivate')
  @SkipAudit() // Audit wird im Service gehandhabt
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.setActive(id, false, {
      user,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Patch(':id/activate')
  @SkipAudit() // Audit wird im Service gehandhabt
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User activated' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.usersService.setActive(id, true, {
      user,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }
}
