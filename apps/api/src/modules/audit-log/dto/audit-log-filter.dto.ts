import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsUUID,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { AuditAction } from '@prisma/client';

export class AuditLogFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type',
    example: 'Contract',
  })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    enum: AuditAction,
    isArray: true,
  })
  @IsArray()
  @IsEnum(AuditAction, { each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? (value as AuditAction[]) : [value as AuditAction],
  )
  action?: AuditAction[];

  @ApiPropertyOptional({
    description: 'Filter by contract ID',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter to date',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}
