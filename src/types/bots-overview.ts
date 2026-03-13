import type { Bot } from '../common/entities/bot.entity';

/** GET /bots/overview response shape. */
export type BotsOverview = {
  activeBots: number;
  totalConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalKbSources: number;
};

/** Bot with tokensUsed attached (e.g. GET /bots list response). */
export type BotWithTokensUsed = Bot & { tokensUsed: number };
