import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'First name',
    example: 'Max',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Mustermann',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Einkauf',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;
}
