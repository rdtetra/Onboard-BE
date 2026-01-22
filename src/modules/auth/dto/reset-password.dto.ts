import { IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsStrongPassword()
  @MaxLength(100)
  password: string;
}
