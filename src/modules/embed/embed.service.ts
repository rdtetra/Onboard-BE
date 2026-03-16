import { Injectable, BadRequestException } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { MessageSender } from '../../types/message';
import type { RequestContext } from '../../types/request';
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

  createConversation(dto: CreateWidgetConversationDto): Promise<Conversation> {
    return this.conversationsService.create(
      widgetCtx,
      dto.botId,
      dto.visitorId,
      { forWidget: true },
    );
  }

  async getMessages(
    conversationId: string,
    visitorId: string,
  ): Promise<Message[]> {
    if (!visitorId?.trim()) {
      throw new BadRequestException('visitorId is required');
    }
    const c = await this.conversationsService.findOne(
      widgetCtx,
      conversationId,
      {
        forWidget: true,
        visitorId,
        relations: [],
        orderMessages: 'ASC',
      },
    );
    return c.messages ?? [];
  }

  addMessage(
    conversationId: string,
    dto: AddWidgetMessageDto,
  ): Promise<Message> {
    return this.conversationsService.addMessage(
      widgetCtx,
      conversationId,
      { content: dto.content, sender: MessageSender.USER },
      { forWidget: true, visitorId: dto.visitorId },
    );
  }

  endConversation(conversationId: string, visitorId: string): Promise<void> {
    if (!visitorId?.trim()) {
      throw new BadRequestException('visitorId is required');
    }
    return this.conversationsService.endConversation(conversationId, {
      forWidget: true,
      visitorId,
    });
  }
}
