import { Controller, Get, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { BillingOverview, TokensByBot } from '../../types/billing';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('overview')
  @Allow(Permission.READ_SUBSCRIPTION)
  getOverview(
    @RequestContext() ctx: RequestContextType,
  ): Promise<BillingOverview> {
    return this.billingService.getOverview(ctx);
  }

  @Get('tokens-by-bot')
  @Allow(Permission.READ_SUBSCRIPTION)
  getTokensUsedByBot(
    @RequestContext() ctx: RequestContextType,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ): Promise<TokensByBot> {
    return this.billingService.getTokensUsedByBot(ctx, {
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    });
  }
}
