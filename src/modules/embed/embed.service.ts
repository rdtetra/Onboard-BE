import { Injectable, BadRequestException } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { MessageSender } from '../../types/message';
import type { RequestContext } from '../../types/request';
import type { WidgetAuthContext } from '../../types/widget-auth';
import { EMBED_SCRIPT } from './embed.script';
import { CreateWidgetConversationDto } from './dto/create-widget-conversation.dto';
import { AddWidgetMessageDto } from './dto/add-widget-message.dto';

const widgetCtx: RequestContext = {
  user: null,
  url: '',
  method: 'GET',
  timestamp: new Date().toISOString(),
  requestId: 'embed-widget',
};

@Injectable()
export class EmbedService {
  constructor(private readonly conversationsService: ConversationsService) {}

  getScript(): string {
    return EMBED_SCRIPT;
  }

  async createConversation(
    widgetAuthContext: WidgetAuthContext,
    dto: CreateWidgetConversationDto,
  ): Promise<Conversation> {
    if (!dto.visitorId?.trim()) {
      throw new BadRequestException('visitorId is required');
    }
    return this.conversationsService.create(
      widgetCtx,
      widgetAuthContext.botId,
      dto.visitorId,
      { forWidget: true },
    );
  }

  async getMessages(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
  ): Promise<Message[]> {
    const c = await this.conversationsService.findOne(
      widgetCtx,
      conversationId,
      {
        forWidget: true,
        botId: widgetAuthContext.botId,
        relations: [],
        orderMessages: 'ASC',
      },
    );
    return c.messages ?? [];
  }

  addMessage(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
    dto: AddWidgetMessageDto,
  ): Promise<Message> {
    return this.conversationsService.addMessage(
      widgetCtx,
      conversationId,
      { content: dto.content, sender: MessageSender.USER },
      { forWidget: true, botId: widgetAuthContext.botId },
    );
  }

  endConversation(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
  ): Promise<void> {
    return this.conversationsService.endConversation(conversationId, {
      forWidget: true,
      botId: widgetAuthContext.botId,
    });
  }
}
