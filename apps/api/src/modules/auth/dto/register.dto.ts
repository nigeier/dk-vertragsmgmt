import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class RegisterDto {
  @ApiProperty({
    description: 'E-Mail-Adresse',
    example: 'neuer.benutzer@drykorn.de',
  })
  @IsEmail({}, { message: 'Bitte gültige E-Mail-Adresse eingeben' })
  @IsNotEmpty({ message: 'E-Mail ist erforderlich' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @ApiProperty({
    description: 'Passwort (mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)',
    example: 'SicheresPasswort123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Passwort ist erforderlich' })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({
    description: 'Vorname',
    example: 'Max',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vorname ist erforderlich' })
  firstName!: string;

  @ApiProperty({
    description: 'Nachname',
    example: 'Mustermann',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nachname ist erforderlich' })
  lastName!: string;

  @ApiProperty({
    description: 'Rolle',
    example: 'USER',
    enum: ['ADMIN', 'MANAGER', 'USER', 'VIEWER'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ADMIN', 'MANAGER', 'USER', 'VIEWER'], { message: 'Ungültige Rolle' })
  role?: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

  @ApiProperty({
    description: 'Abteilung',
    example: 'Einkauf',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;
}
