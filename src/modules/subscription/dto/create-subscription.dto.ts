import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { SubscriptionStatus } from '../../../types/subscription-status';

export class CreateSubscriptionDto {
  @IsUUID()
  orgId: string;

  @IsUUID()
  planId: string;

  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsDateString()
  currentPeriodStart: string;

  @IsDateString()
  currentPeriodEnd: string;

  @IsOptional()
  @IsDateString()
  nextRenewalAt?: string | null;

  @IsOptional()
  @IsString()
  providerSubscriptionId?: string | null;
}
