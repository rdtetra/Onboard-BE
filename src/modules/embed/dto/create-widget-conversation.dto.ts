import { IsOptional, IsUUID } from 'class-validator';

export class CreateWidgetConversationDto {
  @IsOptional()
  @IsUUID()
  botId?: string;

  @IsUUID()
  visitorId: string;
}
