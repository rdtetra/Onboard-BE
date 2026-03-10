import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { MessageSender } from '../../../types/message';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsEnum(MessageSender)
  sender: MessageSender;
}
