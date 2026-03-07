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
  IsDateString,
} from 'class-validator';
import {
  BotType,
  VisibilityDuration,
  Behavior,
  BotPriority,
} from '../../../types/bot';

const DOMAIN_REGEX =
  /^(localhost|([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)$/;
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

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  introMessage?: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(DOMAIN_REGEX, {
    each: true,
    message:
      'Each domain must be a valid hostname (e.g. example.com or localhost)',
  })
  @IsNotEmpty()
  domains: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(TARGET_URL_REGEX, {
    each: true,
    message: 'Each target URL must be a path starting with /',
  })
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @ArrayMinSize(1, {
    message: 'Project bot must have at least one target URL',
  })
  targetUrls?: string[];

  @IsOptional()
  @IsEnum(VisibilityDuration)
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  visibilityDuration?: VisibilityDuration;

  @IsOptional()
  @IsBoolean()
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  oncePerSession?: boolean;

  @IsOptional()
  @IsEnum(Behavior)
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  behavior?: Behavior;

  @IsOptional()
  @IsEnum(BotPriority)
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  priority?: BotPriority;

  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  visibilityStartDate?: string;

  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  visibilityEndDate?: string;
}
