import { Injectable, OnModuleInit } from '@nestjs/common';
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
  constructor(
    private readonly inAppEventsService: InAppEventsService,
    private readonly conversationsService: ConversationsService,
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

      await new Promise((resolve) => setTimeout(resolve, 1400));

      // TODO: Replace this temporary simulation with actual OpenAI prompt + response.
      const botText = `Got it. You said: "${userContent}"`;
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
    } catch {
      this.inAppEventsService.emit(InAppEvents.BOT_STATUS_CHANGED, {
        botId,
        visitorId,
        conversationId,
        status: BotReplyStatus.ERROR,
        updatedAt: new Date(),
      });
    }
  }
}
