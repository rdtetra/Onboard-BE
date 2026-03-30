import type { Bot } from '../common/entities/bot.entity';

export const OVERVIEW_CONVERSATION_PERIODS = ['7days', '30days', '90days'] as const;
export type OverviewConversationPeriod =
  (typeof OVERVIEW_CONVERSATION_PERIODS)[number];

export type OverviewConversationDay = { date: string; count: number };

/** GET /bots/overview response shape. */
export type BotsOverview = {
  activeBots: number;
  totalConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalKbSources: number;
  conversationsOverTime?: OverviewConversationDay[];
};

/** Bot with tokensUsed attached (e.g. GET /bots list response). */
export type BotWithTokensUsed = Bot & { tokensUsed: number };
