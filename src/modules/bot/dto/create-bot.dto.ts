import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BotType, Behavior } from '../../../common/enums/bot.enum';
import { transformTrimDomainsArray } from '../transforms/trim-domains-array.transform';
import { BOT_TARGET_PATH_REGEX } from '../../../common/regex';

export class CreateBotDto {
  @IsIn([BotType.GENERAL, BotType.PROJECT], {
    message: 'botType must be GENERAL or PROJECT',
  })
  @IsNotEmpty()
  botType: BotType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'description is required' })
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  introMessage?: string;

  /** Hostname format validated in BotService (`BOT_DOMAIN_REGEX` in common/regex). */
  @Transform(transformTrimDomainsArray)
  @ValidateIf((o) => o.botType === BotType.GENERAL || o.botType === BotType.PROJECT)
  @IsArray()
  @ArrayMinSize(1, { message: 'domains must include at least one hostname' })
  @IsString({ each: true })
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @ArrayMaxSize(1, { message: 'Project bot must have exactly one domain' })
  domains: string[];

  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @IsNotEmpty({
    message:
      'Project bots must have a parent general bot (parentBotId is required)',
  })
  @IsUUID('4', { message: 'parentBotId must be a valid UUID' })
  parentBotId?: string | null;

  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @IsArray()
  @IsString({ each: true })
  @Matches(BOT_TARGET_PATH_REGEX, {
    each: true,
    message: 'Each target URL must be a path starting with /',
  })
  @ArrayMinSize(1, {
    message: 'targetUrls is required for project bots (at least one path)',
  })
  targetUrls?: string[];

  @IsOptional()
  @IsBoolean()
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @Type(() => Boolean)
  oncePerSession?: boolean;

  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @IsEnum(Behavior)
  @IsNotEmpty({ message: 'behavior is required for project bots' })
  behavior?: Behavior;

  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @IsDateString()
  @IsNotEmpty({ message: 'visibilityStartDate is required for project bots' })
  visibilityStartDate?: string;

  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @IsDateString()
  @IsNotEmpty({ message: 'visibilityEndDate is required for project bots' })
  visibilityEndDate?: string;
}
