import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerDto {
  @ApiProperty({
    description: 'Partner name',
    example: 'Textile GmbH',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Partner type',
    example: 'Lieferant',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    description: 'Address',
    example: 'Musterstraße 123, 80331 München',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'Max Mustermann',
  })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'kontakt@textile-gmbh.de',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+49 89 123456',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Tax ID (USt-IdNr.)',
    example: 'DE123456789',
  })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Premium-Lieferant seit 2020',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
