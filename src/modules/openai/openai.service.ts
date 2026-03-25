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
import { ConversationsService } from '../conversations/conversations.service';
import { MessageSender } from '../../types/message';
import { KbRetrievalService } from '../kb-retrieval/kb-retrieval.service';
import type { RequestContext } from '../../types/request';

@Injectable()
export class OpenAiService implements OnModuleInit {
  private readonly logger = new Logger(OpenAiService.name);
  private static readonly SYSTEM_PROMPT =
    'You are a careful and accurate assistant. ' +
    'Do not make up facts, names, links, prices, policies, or technical details. ' +
    'If you are not certain or do not have enough information, say that clearly and politely, ' +
    'for example: "I’m not sure based on the information I have right now." ' +
    'Prefer correctness over completeness. Keep responses concise and clear.';

  constructor(
    private readonly inAppEventsService: InAppEventsService,
    private readonly conversationsService: ConversationsService,
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
    const { conversationId, botId, visitorId, userContent } = payload;
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
      const context = await this.kbRetrievalService.retrieveContext(
        botId,
        userContent,
      );
      const systemCtx: RequestContext = {
        user: null,
        url: '/system/openai',
        method: 'SYSTEM',
        timestamp: new Date().toISOString(),
        requestId: 'openai-bot-reply',
      };
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
      const userPrompt = `Question:\n${userContent}\n\nUse ONLY the context below. Do not use prior memory or outside knowledge.\nIf the answer is not in this context, respond: "I’m sorry, I can’t answer that right now. Please try asking in a different way."\n\n${context}`;

      const botText = await this.streamChatCompletion({
        apiKey,
        model,
        baseUrl,
        apiVersion,
        messages: [
          { role: 'system', content: OpenAiService.SYSTEM_PROMPT },
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
