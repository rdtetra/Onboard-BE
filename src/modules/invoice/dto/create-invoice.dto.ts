import {
  IsUUID,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';

export class CreateInvoiceDto {
  @IsUUID()
  orgId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string | null;

  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  amountDue: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  amountPaid?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerInvoiceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  invoicePdfUrl?: string | null;

  @IsOptional()
  @IsDateString()
  periodStart?: string | null;

  @IsOptional()
  @IsDateString()
  periodEnd?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsDateString()
  paidAt?: string | null;
}
