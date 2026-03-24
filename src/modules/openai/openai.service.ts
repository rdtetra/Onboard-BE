import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BotReplyStatus,
  InAppEvents,
  type InAppBotReplyRequiredPayload,
} from '../../types/events';
import { InAppEventsService } from '../events/in-app-events.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageSender } from '../../types/message';

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

      const response = await fetch(`${baseUrl}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: OpenAiService.SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          temperature: 0.7,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI request failed: ${response.status} ${errText}`);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const botText = data?.choices?.[0]?.message?.content?.trim();
      if (!botText) {
        throw new Error('OpenAI returned empty response');
      }
      await this.conversationsService.addMessage(
        {
          user: null,
          url: '/system/openai',
          method: 'SYSTEM',
          timestamp: new Date().toISOString(),
          requestId: 'openai-bot-reply',
        },
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
}
