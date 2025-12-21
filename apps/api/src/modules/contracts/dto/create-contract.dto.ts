import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @ApiProperty({
    description: 'Contract title',
    example: 'Liefervertrag für Stoffe 2024',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Contract description',
    example: 'Rahmenvertrag für die Lieferung von Premium-Stoffen',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Contract type',
    enum: ContractType,
    example: ContractType.SUPPLIER,
  })
  @IsEnum(ContractType)
  type!: ContractType;

  @ApiPropertyOptional({
    description: 'Contract status',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @ApiPropertyOptional({
    description: 'Contract start date',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Notice period in days',
    example: 90,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  noticePeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Auto renewal enabled',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoRenewal?: boolean;

  @ApiPropertyOptional({
    description: 'Contract value',
    example: 50000.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'EUR',
    default: 'EUR',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: '30 Tage netto',
  })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['premium', 'textile'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom fields as JSON',
    example: { department: 'Einkauf', priority: 'high' },
  })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;

  @ApiProperty({
    description: 'Partner ID',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  partnerId!: string;

  @ApiPropertyOptional({
    description: 'Owner user ID (defaults to creator)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  ownerId?: string;
}
