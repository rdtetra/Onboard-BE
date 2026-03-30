import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';
import {
  BotReplyStatus,
  InAppEvents,
  type InAppBotReplyRequiredPayload,
} from '../../types/events';
import { InAppEventsService } from '../events/in-app-events.service';
import { ConversationService } from '../conversation/conversation.service';
import { Message } from '../../common/entities/message.entity';
import { MessageSender } from '../../types/message';
import { KbRetrievalService } from '../kb-retrieval/kb-retrieval.service';
import { RequestContextId, type RequestContext } from '../../types/request';
import { createInternalContext } from '../../common/utils/request-context.util';

@Injectable()
export class OpenAiService implements OnModuleInit {
  private readonly logger = new Logger(OpenAiService.name);
  private static readonly SYSTEM_PROMPT =
    'You are a careful and accurate assistant. ' +
    'Ground factual claims in the knowledge passages supplied in the latest user message when they apply. ' +
    'Do not invent facts, names, links, prices, policies, or technical details. ' +
    'You may use earlier turns in this chat only to understand the latest message (references, pronouns, what was asked before). ' +
    'Prefer correctness over completeness. Keep responses concise. ' +
    'If something is not covered by the passages, say briefly that you do not have that detail—do not output a long canned apology and do not change topic mid-answer.';

  private static readonly MAX_PRIOR_MESSAGES_IN_CONTEXT = 40;
  private static readonly MAX_RETRIEVAL_QUERY_CHARS = 6000;

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
  ) {}

  onModuleInit(): void {
    this.inAppEventsService.on(
      InAppEvents.BOT_REPLY_REQUIRED,
      (payload: InAppBotReplyRequiredPayload) => {
        void this.processBotReply(payload);
      },
    );
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

      const apiKey = this.getRequiredEnv('OPENAI_API_KEY');
      const model = this.getRequiredEnv('OPENAI_MODEL');
      const baseUrl = this.getRequiredEnv('OPENAI_BASE_URL').replace(/\/+$/, '');
      const apiVersion = this.getRequiredEnv('OPENAI_API_VERSION');
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
      const systemCtx: RequestContext = createInternalContext(
        RequestContextId.OPENAI_BOT_REPLY,
      );
      if (!context.trim()) {
        await this.conversationsService.addMessage(
          systemCtx,
          conversationId,
          {
            content:
              "I’m sorry, I can’t answer that right now. Please try asking in a different way.",
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
        'Knowledge base passages (retrieval used your recent user messages plus this turn):\n\n' +
        `${context}\n\n` +
        `Latest user message to answer:\n${userContent.trim()}\n\n` +
        'Answer the latest message. Use the passages above for facts when they apply. ' +
        'Use earlier chat messages only to interpret the latest message. ' +
        'If the passages do not support an answer, say so briefly once—do not insert a stock apology in the middle of other sentences.';

      const botText = await this.streamChatCompletion({
        apiKey,
        model,
        baseUrl,
        apiVersion,
        messages: [
          { role: 'system', content: OpenAiService.SYSTEM_PROMPT },
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
      this.inAppEventsService.emit(InAppEvents.BOT_STATUS_CHANGED, {
        botId,
        visitorId,
        conversationId,
        status: BotReplyStatus.ERROR,
        updatedAt: new Date(),
      });
    }
  }

  private getRequiredEnv(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value || !value.trim()) {
      throw new Error(`${name} is missing`);
    }
    return value.trim();
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
