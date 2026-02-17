import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { BotType, VisibilityDuration } from '../../../types/bot';

const DOMAIN_REGEX = /^(localhost|([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)$/;
const TARGET_URL_REGEX = /^\/[a-zA-Z0-9\-_.~/:?=&%]*$/;

export class CreateBotDto {
  @IsEnum(BotType)
  @IsNotEmpty()
  botType: BotType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(DOMAIN_REGEX, { each: true, message: 'Each domain must be a valid hostname (e.g. example.com or localhost)' })
  @IsNotEmpty()
  domains: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(TARGET_URL_REGEX, { each: true, message: 'Each target URL must be a path starting with /' })
  @ValidateIf((o) => o.botType === BotType.URL_SPECIFIC)
  @ArrayMinSize(1, { message: 'URL-specific bot must have at least one target URL' })
  targetUrls?: string[];

  @IsOptional()
  @IsEnum(VisibilityDuration)
  @ValidateIf((o) => o.botType === BotType.URL_SPECIFIC)
  visibilityDuration?: VisibilityDuration;

  @IsOptional()
  @IsBoolean()
  @ValidateIf((o) => o.botType === BotType.URL_SPECIFIC)
  oncePerSession?: boolean;
}
