import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ContractStatus, ContractType } from '@prisma/client';

export class ContractFilterDto {
  @ApiPropertyOptional({
    description: 'Search in title, contract number, description',
    example: 'Liefervertrag',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ContractStatus,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ContractStatus, { each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? (value as ContractStatus[]) : [value as ContractStatus],
  )
  status?: ContractStatus[];

  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: ContractType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ContractType, { each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? (value as ContractType[]) : [value as ContractType],
  )
  type?: ContractType[];

  @ApiPropertyOptional({
    description: 'Filter by partner ID',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
