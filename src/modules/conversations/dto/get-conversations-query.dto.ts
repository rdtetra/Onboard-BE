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
  date?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
