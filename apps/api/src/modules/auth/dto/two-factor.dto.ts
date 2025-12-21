import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorCodeDto {
  @ApiProperty({
    description: '6-stelliger TOTP-Code aus der Authenticator-App (nur Ziffern)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: '2FA-Code ist erforderlich' })
  @Matches(/^\d{6}$/, { message: '2FA-Code muss genau 6 Ziffern enthalten' })
  code!: string;
}
