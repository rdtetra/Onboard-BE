import { IsUUID, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ConversationStatus } from '../../../types/conversation';

export class GetConversationsQueryDto {
  @IsUUID()
  botId: string;

  @IsOptional()
  @IsUUID()
  visitorId?: string;

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  /** Calendar day in UTC (YYYY-MM-DD). Prefer dateFrom+dateTo to avoid timezone issues. */
  date?: string;

  @IsOptional()
  @IsDateString()
  /** Start of range (UTC). Use with dateTo for timezone-safe filtering. */
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  /** End of range (UTC). Use with dateFrom for timezone-safe filtering. */
  dateTo?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
