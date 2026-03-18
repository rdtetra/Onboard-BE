import { IsUUID } from 'class-validator';

export class CreateWidgetConversationDto {
  @IsUUID()
  visitorId: string;
}
