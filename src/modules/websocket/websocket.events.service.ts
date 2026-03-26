import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { BotsService } from '../bots/bots.service';
import { InAppEventsService } from '../events/in-app-events.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  BotReplyStatus,
  InAppEvents,
  type InAppBotStreamDeltaPayload,
  type InAppBotStatusPayload,
  WebSocketEvents,
  type InAppMessageStatusPayload,
  type InAppSendMessagePayload,
} from '../../types/events';
import type { WidgetAuthContext } from '../../types/widget-auth';
import { RequestContextId, type RequestContext } from '../../types/request';
import type { JoinRoomAck, JoinRoomPayload } from '../../types/websocket';
import { JwtWrapperService } from '../jwt/jwt.service';
import { createRequestContext } from '../../common/utils/request-context.util';

@Injectable()
export class WebsocketEventsService implements OnModuleInit {
  private readonly logger = new Logger(WebsocketEventsService.name);
  private server: Server | null = null;

  constructor(
    private readonly inAppEventsService: InAppEventsService,
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly conversationsService: ConversationsService,
    private readonly botsService: BotsService,
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
    this.inAppEventsService.on(
      InAppEvents.BOT_STREAM_DELTA,
      (payload: InAppBotStreamDeltaPayload) => {
        this.handleBotStreamDelta(payload);
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
  ): Promise<JoinRoomAck> {
    if (!payload?.conversationId?.trim() || !payload?.token?.trim()) {
      return { ok: false, error: 'conversationId and token are required' };
    }

    let authContext: WidgetAuthContext;
    try {
      authContext = this.jwtWrapperService.verify<WidgetAuthContext>(
        payload.token.trim(),
        'widget',
      );
    } catch {
      return { ok: false, error: 'Invalid widget token' };
    }

    const botCheckCtx: RequestContext = createRequestContext({
      requestId: RequestContextId.WS_BOT_AUTH,
      user: null,
      url: '/ws/chat',
      method: 'WS',
    });
    try {
      await this.botsService.findOne(botCheckCtx, authContext.botId, {
        forWidget: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      return { ok: false, error: msg || 'Bot is not available' };
    }

    const widgetCtx: RequestContext = createRequestContext({
      requestId: RequestContextId.WS_JOIN_ROOM,
      user: null,
      url: '/ws/chat',
      method: 'WS',
    });
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
      return { ok: false, error: 'Conversation not found' };
    }
    if (conversation.botId !== authContext.botId) {
      return { ok: false, error: 'Conversation not found' };
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

  private handleBotStreamDelta(payload: InAppBotStreamDeltaPayload): void {
    const server = this.server;
    if (!server) {
      this.logger.warn('Websocket server not initialized; skipping emit');
      return;
    }
    const room = this.getRoomName(payload.botId, payload.visitorId);
    server.to(room).emit(WebSocketEvents.BOT_STREAM_DELTA, {
      conversationId: payload.conversationId,
      delta: payload.delta,
    });
  }

  // WIDGET_ERROR remains reserved for async/runtime failures, not JOIN_ROOM ack failures.
}
