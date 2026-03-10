import {
  IsEnum,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ChipType } from '../../../types/task';

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
  @ValidateIf((o) => o.type === ChipType.LINK)
  @IsUrl()
  @IsNotEmpty({ message: 'url is required when chip type is link' })
  @MaxLength(2048)
  url?: string;
}
