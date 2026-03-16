import { Injectable, BadRequestException } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import { JwtWrapperService } from '../jwt/jwt.service';
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

interface WidgetTokenPayload {
  botId: string;
  type: string;
}

@Injectable()
export class EmbedService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly jwtWrapperService: JwtWrapperService,
  ) {}

  getScript(): string {
    return EMBED_SCRIPT;
  }

  async createConversation(
    dto: CreateWidgetConversationDto,
    authorization?: string,
  ): Promise<Conversation> {
    let botId: string;
    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice(7);
      const payload = this.jwtWrapperService.verify<WidgetTokenPayload>(
        token,
        'widget',
      );
      if (payload?.type !== 'widget' || !payload?.botId) {
        throw new BadRequestException('Invalid widget token');
      }
      botId = payload.botId;
    } else {
      if (!dto.botId) {
        throw new BadRequestException('botId or Authorization token is required');
      }
      botId = dto.botId;
    }
    if (!dto.visitorId?.trim()) {
      throw new BadRequestException('visitorId is required');
    }
    return this.conversationsService.create(
      widgetCtx,
      botId,
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
