import {
  IsString,
  MaxLength,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanKey } from '../../../common/enums/plan-key.enum';

export class CreatePlanDto {
  @IsOptional()
  @IsEnum(PlanKey)
  key?: PlanKey | null;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyPriceCents: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyTokens: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  storageLimitMb: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxBots: number;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown> | null;
}
