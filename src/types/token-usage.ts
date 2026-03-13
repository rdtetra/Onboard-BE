/** Params for consuming tokens (e.g. when a bot sends a response). */
export type ConsumeTokensParams = {
  /** Organization that owns the bot (and wallet). */
  organizationId: string;
  /** Bot that generated the response. */
  botId: string;
  /** Conversation the message belongs to. */
  conversationId: string;
  /** Number of tokens to deduct (positive integer). */
  amount: number;
  /** Optional metadata (e.g. messageId, model). */
  metadata?: Record<string, unknown>;
};
