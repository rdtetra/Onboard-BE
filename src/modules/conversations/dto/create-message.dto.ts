import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageSender } from '../../../types/message';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsEnum(MessageSender)
  sender: MessageSender;

  /** Token count to deduct from org wallet when sender is BOT (required for bot messages). */
  @ValidateIf((o) => o.sender === MessageSender.BOT)
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tokenCount?: number;
}
