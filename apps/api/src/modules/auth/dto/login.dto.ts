import { IsString, IsNotEmpty, MinLength, IsEmail, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'E-Mail-Adresse',
    example: 'benutzer@drykorn.de',
  })
  @IsEmail({}, { message: 'Bitte gültige E-Mail-Adresse eingeben' })
  @IsNotEmpty({ message: 'E-Mail ist erforderlich' })
  email!: string;

  @ApiProperty({
    description: 'Passwort',
    example: 'SicheresPasswort123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Passwort ist erforderlich' })
  @MinLength(8, { message: 'Passwort muss mindestens 8 Zeichen haben' })
  password!: string;

  @ApiPropertyOptional({
    description: '2FA TOTP-Code (6 Ziffern)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: '2FA-Code muss genau 6 Ziffern enthalten' })
  twoFactorCode?: string;
}
