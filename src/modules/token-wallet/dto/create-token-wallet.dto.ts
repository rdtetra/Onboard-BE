import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTokenWalletDto {
  @IsUUID()
  orgId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  balance?: number;
}
