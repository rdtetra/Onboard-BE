import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoleName } from '../../../types/roles';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  /** When a tenant invites: TENANT or MEMBER. Omitted = TENANT. Ignored when super admin invites. */
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}
