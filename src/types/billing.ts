import type { BillingCycle } from './billing-cycle';

/** GET /billing/overview response shape. */
export type BillingOverviewSubscription = {
  planName: string;
  billingCycle: BillingCycle;
  monthlyPriceCents: number;
  monthlyCost: string;
  nextRenewalAt: string | null;
};

export type BillingOverviewTokens = {
  /** Plan allowance (e.g. monthly tokens from subscription). */
  total: number;
  /** Sum of usage in current billing period. */
  used: number;
  /** Actual spendable balance in the token wallet (increased by grants, decreased by usage). */
  balance: number;
};

export type BillingOverviewStorage = {
  totalMb: number;
  usedMb: number;
};

export type BillingOverview = {
  subscription: BillingOverviewSubscription | null;
  tokens: BillingOverviewTokens;
  storage: BillingOverviewStorage;
};

/** GET /billing/tokens-by-bot response shape. */
export type TokensByBotItem = {
  botId: string | null;
  botName: string | null;
  tokensUsed: number;
};

export type TokensByBot = {
  usageByBot: TokensByBotItem[];
  tokens: BillingOverviewTokens;
};
