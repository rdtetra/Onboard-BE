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
import { BotType, Behavior, BotPriority } from '../../../common/enums/bot.enum';

const DOMAIN_REGEX =
  /^(localhost|([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)$/;
const TARGET_URL_REGEX = /^\/[a-zA-Z0-9\-_.~/:?=&%]*$/;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(DOMAIN_REGEX, {
    each: true,
    message:
      'Each domain must be a valid hostname (e.g. example.com or localhost)',
  })
  @ValidateIf((o) => o.botType === BotType.GENERAL || o.botType === BotType.PROJECT)
  @ArrayMinSize(1, { message: 'domains is required for general and project bots' })
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @ArrayMaxSize(1, { message: 'Project bot must have exactly one domain' })
  domains?: string[];

  @IsOptional()
  @ValidateIf((o) => o.botType === BotType.PROJECT)
  @IsUUID('4', { message: 'parentBotId must be a valid UUID' })
  parentBotId?: string | null;

  @ValidateIf(
    (o) => o.botType === BotType.PROJECT,
  )
  @IsArray()
  @IsString({ each: true })
  @Matches(TARGET_URL_REGEX, {
    each: true,
    message: 'Each target URL must be a path starting with /',
  })
  @ArrayMinSize(1, {
    message: 'targetUrls is required for project bots (at least one path)',
  })
  targetUrls?: string[];

  @IsOptional()
  @IsBoolean()
  @ValidateIf(
    (o) => o.botType === BotType.PROJECT,
  )
  oncePerSession?: boolean;

  @ValidateIf(
    (o) => o.botType === BotType.PROJECT,
  )
  @IsEnum(Behavior)
  @IsNotEmpty({ message: 'behavior is required for project bots' })
  behavior?: Behavior;

  @ValidateIf(
    (o) => o.botType === BotType.PROJECT,
  )
  @IsEnum(BotPriority)
  @IsNotEmpty({ message: 'priority is required for project bots' })
  priority?: BotPriority;

  @ValidateIf(
    (o) => o.botType === BotType.PROJECT,
  )
  @IsDateString()
  @IsNotEmpty({ message: 'visibilityStartDate is required for project bots' })
  visibilityStartDate?: string;

  @ValidateIf(
    (o) => o.botType === BotType.PROJECT,
  )
  @IsDateString()
  @IsNotEmpty({ message: 'visibilityEndDate is required for project bots' })
  visibilityEndDate?: string;
}
