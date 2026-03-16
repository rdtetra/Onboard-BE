import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class AddWidgetMessageDto {
  @IsUUID()
  visitorId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
