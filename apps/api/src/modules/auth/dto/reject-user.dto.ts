import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectUserDto {
  @ApiPropertyOptional({
    description: 'Grund für die Ablehnung',
    example: 'Nicht autorisiert für dieses System',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
