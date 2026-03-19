import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Server, Socket } from 'socket.io';
import { JwtWrapperService } from '../jwt/jwt.service';
import { Conversation } from '../../common/entities/conversation.entity';
import type { WidgetAuthContext } from '../../types/widget-auth';
import type { JoinConversationPayload } from '../../types/websocket';
import { WebsocketEventsService } from './websocket.events.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class WidgetChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly websocketEventsService: WebsocketEventsService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  handleConnection(client: Socket): void {
    this.websocketEventsService.onConnection(client.id);
  }

  handleDisconnect(client: Socket): void {
    this.websocketEventsService.onDisconnection(client.id);
  }

  @SubscribeMessage('joinConversation')
  async joinConversation(
    @MessageBody() payload: JoinConversationPayload,
    @ConnectedSocket() client: Socket,
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

    const conversation = await this.conversationRepository.findOne({
      where: { id: payload.conversationId.trim() },
      select: ['id', 'botId'],
    });
    if (!conversation || conversation.botId !== authContext.botId) {
      throw new WsException('Conversation not found');
    }

    const room = this.conversationRoom(conversation.id);
    await client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('leaveConversation')
  async leaveConversation(
    @MessageBody() payload: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: true }> {
    const room = this.conversationRoom(payload?.conversationId?.trim?.() ?? '');
    if (room !== 'conversation:') {
      await client.leave(room);
    }
    return { ok: true };
  }
}
