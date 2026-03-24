import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { MessageSender } from '../../../types/message';

export class AddWidgetMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsEnum(MessageSender)
  sender?: MessageSender;
}
