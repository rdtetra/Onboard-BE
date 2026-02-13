import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;
}
