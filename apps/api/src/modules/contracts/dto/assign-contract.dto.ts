import { IsUUID, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignContractDto {
  @ApiProperty({
    description: 'ID des neuen Verantwortlichen',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Ungültige Benutzer-ID' })
  @IsNotEmpty({ message: 'Benutzer-ID ist erforderlich' })
  ownerId!: string;

  @ApiPropertyOptional({
    description: 'Optionaler Grund für die Zuweisung (für Audit-Log)',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
