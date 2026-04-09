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
import { PaymentProvider } from '../../../common/enums/payment-provider.enum';
import { PaymentMethodType } from '../../../common/enums/payment-method-type.enum';
import {
  PAYMENT_CARD_EXPIRY_REGEX,
  PAYMENT_CARD_NUMBER_CHARS_REGEX,
  PAYMENT_CARD_PREFIX_DIGITS_REGEX,
} from '../../../common/regex';

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
  @Matches(PAYMENT_CARD_NUMBER_CHARS_REGEX, {
    message: 'cardNumber must contain only digits, spaces or dashes',
  })
  cardNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameOnCard?: string | null;

  @IsOptional()
  @IsString()
  @Matches(PAYMENT_CARD_EXPIRY_REGEX, {
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
  @Matches(PAYMENT_CARD_PREFIX_DIGITS_REGEX, {
    message: 'cardPrefix must be 6 digits',
  })
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
