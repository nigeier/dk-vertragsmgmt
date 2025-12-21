import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Aktuelles Passwort',
    example: 'AltesPasswort123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Aktuelles Passwort ist erforderlich' })
  oldPassword!: string;

  @ApiProperty({
    description: 'Neues Passwort (mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)',
    example: 'NeuesPasswort456!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Neues Passwort ist erforderlich' })
  @IsStrongPassword()
  newPassword!: string;
}
