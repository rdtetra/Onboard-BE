import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TokenWalletService } from '../token-wallet/token-wallet.service';
import { TokenTransactionsService } from '../token-transactions/token-transactions.service';
import { SourcesService } from '../knowledge-base/sources.service';
import { BotsService } from '../bots/bots.service';
import type { BillingCycle } from '../../types/billing-cycle';
import type { RequestContext } from '../../types/request';
import type {
  BillingOverview,
  BillingOverviewTokens,
  TokensByBot,
  TokensByBotItem,
} from '../../types/billing';

@Injectable()
export class BillingService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly tokenWalletService: TokenWalletService,
    private readonly tokenTransactionsService: TokenTransactionsService,
    private readonly sourcesService: SourcesService,
    private readonly botsService: BotsService,
  ) {}

  async getOverview(ctx: RequestContext): Promise<BillingOverview> {
    const orgId = ctx.user?.organizationId;
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    const subscription =
      await this.subscriptionsService.findCurrentForOrganization(ctx);
    const wallet = await this.tokenWalletService.getOrCreateForOrganization(
      orgId,
    );

    const plan = subscription?.plan ?? null;
    const billingCycle: BillingCycle = 'MONTHLY';
    const monthlyPriceCents = plan?.monthlyPriceCents ?? 0;
    const monthlyCost =
      monthlyPriceCents > 0 ? (monthlyPriceCents / 100).toFixed(2) : '0';
    const nextRenewalAt = subscription?.nextRenewalAt
      ? subscription.nextRenewalAt.toISOString()
      : null;
    const tokensTotal = plan?.monthlyTokens ?? 0;
    const storageTotalMb = plan?.storageLimitMb ?? 0;

    let tokensUsed = 0;
    if (subscription && wallet) {
      tokensUsed =
        await this.tokenTransactionsService.getUsageSumForWalletInPeriod(
          wallet.id,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd,
        );
    }

    const storageUsedBytes =
      await this.sourcesService.getTotalStorageBytesForOrganization(ctx);
    const storageUsedMb =
      Math.round((storageUsedBytes / (1024 * 1024)) * 100) / 100;

    return {
      subscription: subscription && plan
        ? {
            planName: plan.name,
            billingCycle,
            monthlyPriceCents,
            monthlyCost,
            nextRenewalAt,
          }
        : null,
      tokens: {
        total: tokensTotal,
        used: tokensUsed,
        balance: wallet.balance,
      },
      storage: { totalMb: storageTotalMb, usedMb: storageUsedMb },
    };
  }

  async getTokensUsedByBot(
    ctx: RequestContext,
    options?: { periodStart?: Date; periodEnd?: Date },
  ): Promise<TokensByBot> {
    const orgId = ctx.user?.organizationId;
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }
    const wallet =
      await this.tokenWalletService.getOrCreateForOrganization(orgId);
    const subscription =
      await this.subscriptionsService.findCurrentForOrganization(ctx);

    const periodStart = options?.periodStart ?? subscription?.currentPeriodStart;
    const periodEnd = options?.periodEnd ?? subscription?.currentPeriodEnd;

    const plan = subscription?.plan ?? null;
    const tokensTotal = plan?.monthlyTokens ?? 0;
    let tokensUsedForPeriod = 0;
    if (wallet && periodStart && periodEnd) {
      tokensUsedForPeriod =
        await this.tokenTransactionsService.getUsageSumForWalletInPeriod(
          wallet.id,
          periodStart,
          periodEnd,
        );
    }
    const tokensSummary: BillingOverviewTokens = {
      total: tokensTotal,
      used: tokensUsedForPeriod,
      balance: wallet.balance,
    };

    const usageRows =
      await this.tokenTransactionsService.getUsageByBotForWalletInPeriod(
        wallet.id,
        periodStart && periodEnd
          ? { periodStart, periodEnd }
          : undefined,
      );

    const usageByBotId = new Map<string | null, number>();
    for (const row of usageRows) {
      usageByBotId.set(row.botId, row.tokensUsed);
    }

    const bots = await this.botsService.findOptions(ctx);

    const usageByBot: TokensByBotItem[] = bots.map((bot) => ({
      botId: bot.id,
      botName: bot.name,
      tokensUsed: usageByBotId.get(bot.id) ?? 0,
    }));

    const unknownUsage = usageByBotId.get(null) ?? 0;
    if (unknownUsage > 0) {
      usageByBot.push({
        botId: null,
        botName: 'Unknown',
        tokensUsed: unknownUsage,
      });
    }

    return { usageByBot, tokens: tokensSummary };
  }
}
