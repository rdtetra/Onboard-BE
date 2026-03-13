import {
  IsUUID,
  IsEnum,
  IsInt,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TokenTransactionType } from '../../../types/token-transaction-type';

export class CreateTokenTransactionDto {
  @IsUUID()
  walletId: string;

  @IsEnum(TokenTransactionType)
  type: TokenTransactionType;

  @IsInt()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsUUID()
  botId?: string | null;

  @IsOptional()
  @IsUUID()
  conversationId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
