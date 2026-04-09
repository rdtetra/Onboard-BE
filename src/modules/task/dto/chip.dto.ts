import {
  IsEnum,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsUrl,
  ValidateIf,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ChipType } from '../../../common/enums/task.enum';
import { transformLinkChipUrl } from '../transforms/link-chip-url.transform';

export class ChipDto {
  @IsEnum(ChipType)
  @IsNotEmpty()
  type: ChipType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  chipName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  chipText: string;

  /** Required when type is 'link'. Must be a valid URL. */
  @Transform(transformLinkChipUrl)
  @ValidateIf((o) => o.type === ChipType.LINK)
  @IsUrl()
  @IsNotEmpty({ message: 'url is required when chip type is link' })
  @MaxLength(2048)
  url?: string;

  /** Open link in new tab (for link-type chips only). Default false. Validated only when type is LINK. */
  @ValidateIf((o) => o.type === ChipType.LINK)
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  newTab?: boolean;
}
