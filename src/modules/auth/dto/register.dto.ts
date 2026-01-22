import { IsEmail, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  @MaxLength(100)
  password: string;

  @IsString()
  @MaxLength(200)
  fullName: string;
}
