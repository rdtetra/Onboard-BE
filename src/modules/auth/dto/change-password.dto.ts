import { IsString, MaxLength, IsOptional } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class ChangePasswordDto {
  /** Required when user does not have passwordChangeRequired; omit when setting password after invite. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentPassword?: string;

  @IsString()
  @IsStrongPassword()
  @MaxLength(100)
  newPassword: string;
}
