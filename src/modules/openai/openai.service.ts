import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';
import {
  type InAppBotReplyRequiredPayload,
} from '../../types/events';
import { BotReplyStatus, InAppEvents } from '../../common/enums/events.enum';
import { InAppEventsService } from '../events/in-app-events.service';
import { ConversationService } from '../conversation/conversation.service';
import { Message } from '../../common/entities/message.entity';
import { MessageSender } from '../../common/enums/message.enum';
import { KbRetrievalService } from '../kb-retrieval/kb-retrieval.service';
import { TokenUsageService } from '../token-transaction/token-usage.service';
import { RequestContextId } from '../../common/enums/request-context.enum';
import type { RequestContext } from '../../types/request';
import { createInternalContext } from '../../common/utils/request-context.util';
import { getRequiredEnv } from '../../common/utils/env.util';
import { RoleName } from '../../common/enums/roles.enum';
import type {
  OpenAiCompletionsUsageResult,
  OpenAiEmbeddingsUsageResult,
  OpenAiUsagePage,
  OpenAiUsageQuery,
} from '../../types/openai-usage';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);

  private static readonly SYSTEM_PROMPT_CORE =
    'You are a careful and accurate support assistant. ' +
    'Only treat something as a fact if it is supported by the reference material in the latest user message; do not answer factual questions from general world knowledge. ' +
    'You may use earlier chat turns only to understand the latest message (pronouns, context). ' +
    'Prefer correctness over completeness. Keep responses concise and conversational. ' +
    'If the reference material partly applies, you may briefly summarize what it covers or ask a short clarifying question using terms that actually appear there (e.g. “Did you mean …?”). ' +
    'Do not invent facts. ' +
    'Never mention to the user: passages, documents, knowledge base, retrieval, embeddings, “the text provided”, “according to the sources”, or anything that reveals internal tooling—you sound like normal human support. ' +
    'Closing lines: do not end replies with generic invitations such as “feel free to ask”, “let me know if you have more questions”, or “if you have more specific questions about …, feel free to ask” when you have given a clear, complete, on-topic answer—stop after the answer. ' +
    'Only add a short offer to help further (one clause or sentence) when the answer is incomplete, uncertain, vague, partly off-material, or you are asking the user to clarify—never as a habit after every message. ' +
    'Format answers with Markdown when it helps (short paragraphs, "- " bullets, numbered lists, **bold**, [label](url) links).';

  private static buildBotReplySystemPrompt(assistantScopeLabel: string): string {
    const scope =
      assistantScopeLabel.trim().length > 0
        ? assistantScopeLabel.trim()
        : 'what we support';
    const scopeQuoted = JSON.stringify(scope);
    return (
      OpenAiService.SYSTEM_PROMPT_CORE +
      ' When the user’s question is outside your scope or nothing in the reference material applies, reply briefly and politely—for example that you can only help with questions related to ' +
      scopeQuoted +
      ' (paraphrase naturally; keep it one or two short sentences). Do not invite clarification about unrelated topics unless the reference material suggests a related on-topic angle. ' +
      'For those off-scope replies only, a brief “happy to help if you have a related question” style sign-off is fine; still avoid repeating it when the user already got a solid answer.'
    );
  }

  private static readonly MAX_PRIOR_MESSAGES_IN_CONTEXT = 40;
  private static readonly MAX_RETRIEVAL_QUERY_CHARS = 6000;
  private static readonly DEFAULT_USAGE_WINDOW_DAYS = 30;

  private static buildRetrievalQueryFromMessages(through: Message[]): string {
    const parts = through
      .filter((m) => m.sender === MessageSender.USER)
      .map((m) => m.content.trim())
      .filter((c) => c.length > 0);
    let q = parts.join('\n');
    const max = OpenAiService.MAX_RETRIEVAL_QUERY_CHARS;
    if (q.length > max) {
      q = q.slice(-max);
    }
    return q;
  }

  constructor(
    private readonly inAppEventsService: InAppEventsService,
    private readonly conversationsService: ConversationService,
    private readonly configService: ConfigService,
    private readonly kbRetrievalService: KbRetrievalService,
    private readonly tokenUsageService: TokenUsageService,
  ) {}

  async getCompletionsUsage(
    ctx: RequestContext,
    query?: OpenAiUsageQuery,
  ): Promise<OpenAiUsagePage<OpenAiCompletionsUsageResult>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    const usageBase = getRequiredEnv(this.configService, 'OPENAI_BASE_URL').replace(
      /\/+$/,
      '',
    );
    const usageApiKey = getRequiredEnv(this.configService, 'OPENAI_ADMIN_API_KEY');
    const organization = this.configService.get<string>('OPENAI_ORGANIZATION');

    try {
      const res = await axios.get<OpenAiUsagePage<OpenAiCompletionsUsageResult>>(
        `${usageBase}/organization/usage/completions`,
        {
          params: this.buildUsageParams(query),
          headers: {
            Authorization: `Bearer ${usageApiKey}`,
            ...(organization?.trim() ? { 'OpenAI-Organization': organization } : {}),
          },
        },
      );
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail =
          (error.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ?? error.message;
        if (status === 401 || status === 403) {
          throw new ForbiddenException(
            `OpenAI usage request (completions) not authorized: ${detail}`,
          );
        }
        throw new BadRequestException(
          `OpenAI usage request (completions) failed: ${detail}`,
        );
      }
      throw error;
    }
  }

  async getEmbeddingsUsage(
    ctx: RequestContext,
    query?: OpenAiUsageQuery,
  ): Promise<OpenAiUsagePage<OpenAiEmbeddingsUsageResult>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    const usageBase = getRequiredEnv(this.configService, 'OPENAI_BASE_URL').replace(
      /\/+$/,
      '',
    );
    const usageApiKey = getRequiredEnv(this.configService, 'OPENAI_ADMIN_API_KEY');
    const organization = this.configService.get<string>('OPENAI_ORGANIZATION');

    try {
      const res = await axios.get<OpenAiUsagePage<OpenAiEmbeddingsUsageResult>>(
        `${usageBase}/organization/usage/embeddings`,
        {
          params: this.buildUsageParams(query),
          headers: {
            Authorization: `Bearer ${usageApiKey}`,
            ...(organization?.trim() ? { 'OpenAI-Organization': organization } : {}),
          },
        },
      );
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail =
          (error.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ?? error.message;
        if (status === 401 || status === 403) {
          throw new ForbiddenException(
            `OpenAI usage request (embeddings) not authorized: ${detail}`,
          );
        }
        throw new BadRequestException(
          `OpenAI usage request (embeddings) failed: ${detail}`,
        );
      }
      throw error;
    }
  }

  private buildUsageParams(query?: OpenAiUsageQuery): Record<string, unknown> {
    const q = query ?? {};

    const params: Record<string, unknown> = {};
    const start = q.startTime?.trim();
    const end = q.endTime?.trim();

    if (start) {
      const n = Number(start);
      if (!Number.isFinite(n)) {
        throw new BadRequestException('start_time must be a unix timestamp');
      }
      params.start_time = Math.floor(n);
    }
    if (end) {
      const n = Number(end);
      if (!Number.isFinite(n)) {
        throw new BadRequestException('end_time must be a unix timestamp');
      }
      params.end_time = Math.floor(n);
    }

    if (params.start_time == null || params.end_time == null) {
      const now = new Date();
      const endExclusive = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      );
      const startInclusive = new Date(endExclusive);
      startInclusive.setUTCDate(
        startInclusive.getUTCDate() - OpenAiService.DEFAULT_USAGE_WINDOW_DAYS,
      );
      if (params.start_time == null) {
        params.start_time = Math.floor(startInclusive.getTime() / 1000);
      }
      if (params.end_time == null) {
        params.end_time = Math.floor(endExclusive.getTime() / 1000);
      }
    }

    params.bucket_width = '1d';

    if (q.page?.trim()) {
      params.page = q.page.trim();
    }

    return params;
  }

  async processBotReply(payload: InAppBotReplyRequiredPayload): Promise<void> {
    const { conversationId, botId, visitorId, userContent, userMessageId } =
      payload;
    try {
      this.inAppEventsService.emit(InAppEvents.BOT_STATUS_CHANGED, {
        botId,
        visitorId,
        conversationId,
        status: BotReplyStatus.THINKING,
        updatedAt: new Date(),
      });

      const systemCtx: RequestContext = createInternalContext(
        RequestContextId.OPENAI_BOT_REPLY,
      );
      const conversationForScope = await this.conversationsService.findOne(
        systemCtx,
        conversationId,
        { forWidget: true, botId, relations: ['bot'] },
      );
      const assistantScopeLabel =
        conversationForScope.bot?.name?.trim() ?? '';

      const apiKey = getRequiredEnv(this.configService, 'OPENAI_API_KEY');
      const model = getRequiredEnv(this.configService, 'OPENAI_MODEL');
      const baseUrl = getRequiredEnv(this.configService, 'OPENAI_BASE_URL').replace(
        /\/+$/,
        '',
      );
      const apiVersion = getRequiredEnv(this.configService, 'OPENAI_API_VERSION');
      const through =
        await this.conversationsService.getMessagesThroughUserMessage(
          conversationId,
          botId,
          userMessageId,
        );
      const prior = through.slice(0, -1);
      const maxPrior = OpenAiService.MAX_PRIOR_MESSAGES_IN_CONTEXT;
      let trimmedPrior =
        prior.length > maxPrior ? prior.slice(-maxPrior) : prior;
      let start = 0;
      while (
        start < trimmedPrior.length &&
        trimmedPrior[start].sender !== MessageSender.USER
      ) {
        start += 1;
      }
      trimmedPrior = trimmedPrior.slice(start);
      const historyMessages = trimmedPrior.map((m) => ({
        role: m.sender === MessageSender.USER ? 'user' : 'assistant',
        content: m.content,
      }));

      const retrievalQuery =
        OpenAiService.buildRetrievalQueryFromMessages(through);
      const context = await this.kbRetrievalService.retrieveContext(
        botId,
        retrievalQuery,
      );
      if (!context.trim()) {
        const offTopicLine =
          assistantScopeLabel.length > 0
            ? `Sorry—I can only help with questions related to ${assistantScopeLabel}.`
            : 'Sorry—I can’t help with that. Please ask something related to what this assistant supports.';
        await this.conversationsService.addMessage(
          systemCtx,
          conversationId,
          {
            content: offTopicLine,
            sender: MessageSender.BOT,
          },
          {
            forSystem: true,
            botId,
            senderOverride: MessageSender.BOT,
            triggerBotReply: false,
          },
        );
        this.inAppEventsService.emit(InAppEvents.BOT_STATUS_CHANGED, {
          botId,
          visitorId,
          conversationId,
          status: BotReplyStatus.DONE,
          updatedAt: new Date(),
        });
        return;
      }
      const userPrompt =
        'Reference material for this turn (internal use only—do not tell the user you are reading reference material, documents, or a knowledge base):\n\n' +
        `${context}\n\n` +
        `Latest user message to answer:\n${userContent.trim()}\n\n` +
        'Answer using only the reference material above for factual claims. ' +
        'Use earlier chat messages only to interpret the latest message. ' +
        'If there is no exact answer in the reference material, you may still reply briefly in a helpful tone: what is covered on-topic, or one clarifying question tied to terms in the material—not general knowledge. ' +
        'When nothing applies, fall back to the scope phrasing from your system instructions. ' +
        'Keep any “I don’t have that detail” style line brief. ' +
        'If the answer is direct and sufficient, end there—no extra “feel free to ask” paragraph.';

      const botText = await this.streamChatCompletion({
        apiKey,
        model,
        baseUrl,
        apiVersion,
        messages: [
          {
            role: 'system',
            content: OpenAiService.buildBotReplySystemPrompt(assistantScopeLabel),
          },
          ...historyMessages,
          { role: 'user', content: userPrompt },
        ],
        onDelta: (delta) => {
          this.inAppEventsService.emit(InAppEvents.BOT_STREAM_DELTA, {
            botId,
            visitorId,
            conversationId,
            delta,
          });
        },
      });
      if (!botText) {
        throw new Error('OpenAI returned empty response');
      }
      await this.conversationsService.addMessage(
        systemCtx,
        conversationId,
        { content: botText, sender: MessageSender.BOT },
        {
          forSystem: true,
          botId,
          senderOverride: MessageSender.BOT,
          triggerBotReply: false,
        },
      );

      this.inAppEventsService.emit(InAppEvents.BOT_STATUS_CHANGED, {
        botId,
        visitorId,
        conversationId,
        status: BotReplyStatus.DONE,
        updatedAt: new Date(),
      });
    } catch (err) {
      this.logger.warn(
        `Failed to generate OpenAI bot reply for conversation ${conversationId}`,
        err instanceof Error ? err.message : String(err),
      );
      await this.refundBotReplyFailureSafely(
        conversationId,
        botId,
        userMessageId,
      );
      this.inAppEventsService.emit(InAppEvents.BOT_STATUS_CHANGED, {
        botId,
        visitorId,
        conversationId,
        status: BotReplyStatus.ERROR,
        updatedAt: new Date(),
      });
    }
  }

  private async refundBotReplyFailureSafely(
    conversationId: string,
    botId: string,
    userMessageId: string,
  ): Promise<void> {
    try {
      const ctx: RequestContext = createInternalContext(
        RequestContextId.OPENAI_BOT_REPLY,
      );
      const conversation = await this.conversationsService.findOne(
        ctx,
        conversationId,
        {
          forWidget: true,
          botId,
          relations: ['bot'],
        },
      );
      const organizationId = conversation.bot?.organizationId;
      if (!organizationId) {
        return;
      }
      await this.tokenUsageService.refundTokens({
        organizationId,
        botId,
        conversationId,
        amount: 1,
        metadata: { userMessageId, reason: 'bot_reply_failed' },
      });
    } catch (refundErr) {
      this.logger.warn(
        `Failed to refund token after bot reply failure for conversation ${conversationId}`,
        refundErr instanceof Error ? refundErr.message : String(refundErr),
      );
    }
  }

  private async streamChatCompletion(params: {
    apiKey: string;
    model: string;
    baseUrl: string;
    apiVersion: string;
    messages: Array<{ role: string; content: string }>;
    onDelta: (delta: string) => void;
  }): Promise<string> {
    const response = await axios.post<Readable>(
      `${params.baseUrl}/chat/completions?api-version=${encodeURIComponent(params.apiVersion)}`,
      {
        model: params.model,
        messages: params.messages,
        temperature: 0.7,
        stream: true,
      },
      {
        responseType: 'stream',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const stream = response.data;
    let buffer = '';
    let fullText = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) {
          continue;
        }
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') {
          continue;
        }
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{
              delta?: { content?: string };
              text?: string;
            }>;
          };
          const delta =
            parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.text ?? '';
          if (!delta) {
            continue;
          }
          fullText += delta;
          params.onDelta(delta);
        } catch {
          continue;
        }
      }
    }

    return fullText.trim();
  }
}
