import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';
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
}
