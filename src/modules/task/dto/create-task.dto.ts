import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUUID,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChipDto } from './chip.dto';

const TARGET_URL_REGEX = /^\/[a-zA-Z0-9\-_.~/:?=&%]*$/;

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  introMessage: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  instruction: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(TARGET_URL_REGEX, {
    each: true,
    message: 'Each target URL must be a path starting with /',
  })
  targetUrls: string[];

  @IsBoolean()
  isActive: boolean;

  @IsUUID()
  @IsNotEmpty()
  botId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  kbSourceIds: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChipDto)
  chips?: ChipDto[];
}
