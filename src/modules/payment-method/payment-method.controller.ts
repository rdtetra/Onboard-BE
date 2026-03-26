import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethod } from '../../common/entities/payment-method.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';

@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private readonly paymentMethodsService: PaymentMethodService) {}

  @Post()
  @Allow(Permission.UPDATE_PAYMENT_METHOD)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.paymentMethodsService.create(ctx, dto);
  }

  @Get()
  @Allow(Permission.READ_PAYMENT_METHOD)
  findForCurrentOrg(
    @RequestContext() ctx: RequestContextType,
  ): Promise<PaymentMethod[]> {
    return this.paymentMethodsService.findForCurrentOrg(ctx);
  }

  @Get(':id')
  @Allow(Permission.READ_PAYMENT_METHOD)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<PaymentMethod> {
    return this.paymentMethodsService.findOne(id, ctx);
  }

  @Patch(':id/set-default')
  @Allow(Permission.UPDATE_PAYMENT_METHOD)
  setAsDefault(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<PaymentMethod> {
    return this.paymentMethodsService.setAsDefault(id, ctx);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_PAYMENT_METHOD)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.paymentMethodsService.update(id, dto, ctx);
  }

  @Delete(':id')
  @Allow(Permission.UPDATE_PAYMENT_METHOD)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.paymentMethodsService.remove(id, ctx);
  }
}
