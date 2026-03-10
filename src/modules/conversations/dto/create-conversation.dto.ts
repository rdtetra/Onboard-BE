import { IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  botId: string;

  @IsUUID()
  visitorId: string;
}
