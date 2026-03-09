import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { WidgetPosition, WidgetAppearance } from '../../../types/widget';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class CreateWidgetDto {
  @IsUUID()
  botId: string;

  /** Bot logo URL (image max 1 MB, png or jpg) */
  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2000)
  botLogoUrl?: string | null;

  @IsOptional()
  @IsEnum(WidgetPosition)
  position?: WidgetPosition;

  @IsOptional()
  @IsEnum(WidgetAppearance)
  appearance?: WidgetAppearance;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'primaryColor must be a valid hex code (e.g. #ffffff)' })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'headerTextColor must be a valid hex code' })
  headerTextColor?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'background must be a valid hex code' })
  background?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'botMessageBg must be a valid hex code' })
  botMessageBg?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'botMessageText must be a valid hex code' })
  botMessageText?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'userMessageBg must be a valid hex code' })
  userMessageBg?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'userMessageText must be a valid hex code' })
  userMessageText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headerText?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  welcomeMessage?: string | null;

  @IsOptional()
  @IsBoolean()
  showPoweredBy?: boolean;
}
