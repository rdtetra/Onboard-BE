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
import { BOT_TARGET_PATH_REGEX } from '../../../common/regex';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(BOT_TARGET_PATH_REGEX, {
    each: true,
    message: 'Each target URL must be a path starting with /',
  })
  targetUrls: string[];

  @IsBoolean()
  isActive: boolean;

  @IsUUID()
  @IsNotEmpty()
  botId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChipDto)
  chips?: ChipDto[];
}
