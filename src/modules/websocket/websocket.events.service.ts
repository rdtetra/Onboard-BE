import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { Server } from 'socket.io';
import { InAppEventsService } from '../events/in-app-events.service';
import {
  InAppEvents,
  WebSocketEvents,
  type InAppSendMessagePayload,
} from '../../types/events';

@Injectable()
export class WebsocketEventsService implements OnModuleInit {
  private readonly logger = new Logger(WebsocketEventsService.name);
  private server: Server | null = null;

  constructor(private readonly inAppEventsService: InAppEventsService) {}

  onModuleInit(): void {
    this.inAppEventsService.on(InAppEvents.SEND_MESSAGE, (payload) => {
      this.handleSendMessage(payload);
    });
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

  private roomName(botId: string, visitorId: string): string {
    return `room_${botId}_${visitorId}`;
  }

  private handleSendMessage(payload: InAppSendMessagePayload): void {
    const server = this.server;
    if (!server) {
      this.logger.warn('Websocket server not initialized; skipping emit');
      return;
    }

    const room = this.roomName(payload.botId, payload.visitorId);
    server.to(room).emit(WebSocketEvents.SEND_MESSAGE, {
      conversationId: payload.conversationId,
      message: payload.message,
    });
  }
}
