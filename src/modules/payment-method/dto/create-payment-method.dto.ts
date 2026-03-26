import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../../../types/payment-provider';
import { PaymentMethodType } from '../../../types/payment-method-type';

export class CreatePaymentMethodDto {
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerPaymentMethodId?: string | null;

  @IsOptional()
  @IsEnum(PaymentMethodType)
  type?: PaymentMethodType;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  @Matches(/^[\d\s-]+$/, {
    message: 'cardNumber must contain only digits, spaces or dashes',
  })
  cardNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameOnCard?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/([0-9]{2}|[0-9]{4})$/, {
    message: 'expiry must be MM/YY or MM/YYYY',
  })
  expiry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  last4?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d+$/, { message: 'cardPrefix must be 6 digits' })
  cardPrefix?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  brand?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  expMonth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  expYear?: number | null;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;
}
