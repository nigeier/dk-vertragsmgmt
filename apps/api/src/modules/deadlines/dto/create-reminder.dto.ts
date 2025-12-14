import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderType } from '@prisma/client';

export class CreateReminderDto {
  @ApiProperty({
    description: 'Reminder type',
    enum: ReminderType,
    example: ReminderType.EXPIRATION,
  })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty({
    description: 'Reminder date',
    example: '2024-12-01',
  })
  @IsDateString()
  @IsNotEmpty()
  reminderDate: string;

  @ApiPropertyOptional({
    description: 'Custom message',
    example: 'Vertrag rechtzeitig verlängern',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: 'Contract ID',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  contractId: string;
}
