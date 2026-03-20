import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { InAppEventsService } from '../events/in-app-events.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  BotReplyStatus,
  InAppEvents,
  type InAppBotStatusPayload,
  WebSocketEvents,
  type InAppMessageStatusPayload,
  type InAppSendMessagePayload,
} from '../../types/events';
import type { WidgetAuthContext } from '../../types/widget-auth';
import type { RequestContext } from '../../types/request';
import type { JoinRoomPayload } from '../../types/websocket';
import { JwtWrapperService } from '../jwt/jwt.service';

@Injectable()
export class WebsocketEventsService implements OnModuleInit {
  private readonly logger = new Logger(WebsocketEventsService.name);
  private server: Server | null = null;

  constructor(
    private readonly inAppEventsService: InAppEventsService,
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly conversationsService: ConversationsService,
  ) {}

  onModuleInit(): void {
    this.inAppEventsService.on(
      InAppEvents.SEND_MESSAGE,
      (payload: InAppSendMessagePayload) => {
        this.handleSendMessage(payload);
      },
    );
    this.inAppEventsService.on(
      InAppEvents.MESSAGE_STATUS_UPDATED,
      (payload: InAppMessageStatusPayload) => {
        this.handleMessageStatusUpdated(payload);
      },
    );
    this.inAppEventsService.on(
      InAppEvents.BOT_STATUS_CHANGED,
      (payload: InAppBotStatusPayload) => {
        this.handleBotStatusChanged(payload);
      },
    );
  }

  bindServer(server: Server): void {
    this.server = server;
  }

  onConnect(clientId: string): void {
    this.logger.log(`Socket connected: ${clientId}`);
  }

  onDisconnect(clientId: string): void {
    this.logger.log(`Socket disconnected: ${clientId}`);
  }

  getRoomName(botId: string, visitorId: string): string {
    return `room_${botId}_${visitorId}`;
  }

  async joinRoom(
    payload: JoinRoomPayload,
    client: Socket,
  ): Promise<{ ok: true; room: string }> {
    if (!payload?.conversationId?.trim() || !payload?.token?.trim()) {
      throw new WsException('conversationId and token are required');
    }

    let authContext: WidgetAuthContext;
    try {
      authContext = this.jwtWrapperService.verify<WidgetAuthContext>(
        payload.token.trim(),
        'widget',
      );
    } catch {
      throw new WsException('Invalid widget token');
    }

    const widgetCtx: RequestContext = {
      user: null,
      url: '/ws/chat',
      method: 'WS',
      timestamp: new Date().toISOString(),
      requestId: 'ws-join-room',
    };
    const conversation = await this.conversationsService.findOne(
      widgetCtx,
      payload.conversationId.trim(),
      {
        relations: [],
        forWidget: true,
        botId: authContext.botId,
      },
    );
    if (!conversation) {
      throw new WsException('Conversation not found');
    }
    if (conversation.botId !== authContext.botId) {
      throw new WsException('Conversation not found');
    }

    const room = this.getRoomName(conversation.botId, conversation.visitorId);
    await client.join(room);
    return { ok: true, room };
  }

  private handleSendMessage(payload: InAppSendMessagePayload): void {
    const server = this.server;
    if (!server) {
      this.logger.warn('Websocket server not initialized; skipping emit');
      return;
    }

    const room = this.getRoomName(payload.botId, payload.visitorId);
    server.to(room).emit(WebSocketEvents.SEND_MESSAGE, {
      conversationId: payload.conversationId,
      message: payload.message,
    });
  }

  private handleMessageStatusUpdated(payload: InAppMessageStatusPayload): void {
    const server = this.server;
    if (!server) {
      this.logger.warn('Websocket server not initialized; skipping emit');
      return;
    }
    const room = this.getRoomName(payload.botId, payload.visitorId);
    server.to(room).emit(WebSocketEvents.MESSAGE_STATUS_UPDATED, {
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      sender: payload.sender,
      status: payload.status,
      updatedAt: payload.updatedAt,
    });
  }

  private handleBotStatusChanged(payload: InAppBotStatusPayload): void {
    const server = this.server;
    if (!server) {
      this.logger.warn('Websocket server not initialized; skipping emit');
      return;
    }
    const room = this.getRoomName(payload.botId, payload.visitorId);
    server.to(room).emit(WebSocketEvents.BOT_STATUS_CHANGED, {
      conversationId: payload.conversationId,
      status: payload.status,
      updatedAt: payload.updatedAt,
      isDone: payload.status === BotReplyStatus.DONE,
    });
  }
}
