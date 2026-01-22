import {
  IsEmail,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  @MaxLength(100)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;
}
