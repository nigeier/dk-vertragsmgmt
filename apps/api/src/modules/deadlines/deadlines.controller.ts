import {
  Controller,
  Get,
  Post,
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
import { DeadlinesService } from './deadlines.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { KeycloakAuthGuard, AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('deadlines')
@ApiBearerAuth('access-token')
@UseGuards(KeycloakAuthGuard)
@Controller('deadlines')
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming deadlines' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days ahead (default: 30)' })
  @ApiResponse({ status: 200, description: 'Upcoming deadlines returned' })
  async getUpcoming(
    @Query('days') days: number = 30,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deadlinesService.getUpcoming(days, user);
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get reminders for a contract' })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Reminders returned' })
  async getByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deadlinesService.getByContract(contractId, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a reminder' })
  @ApiResponse({ status: 201, description: 'Reminder created' })
  async create(
    @Body() createReminderDto: CreateReminderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deadlinesService.create(createReminderDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reminder' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Reminder deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deadlinesService.remove(id, user);
  }
}
