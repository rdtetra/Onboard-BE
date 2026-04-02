import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { MessageSender } from '../../../common/enums/message.enum';

export class AddWidgetMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsEnum(MessageSender)
  sender?: MessageSender;
}
