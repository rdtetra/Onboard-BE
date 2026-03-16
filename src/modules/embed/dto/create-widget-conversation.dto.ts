import { IsUUID } from 'class-validator';

export class CreateWidgetConversationDto {
  @IsUUID()
  botId: string;

  @IsUUID()
  visitorId: string;
}
