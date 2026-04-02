import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { WebSocketEvents } from '../../common/enums/events.enum';
import type { JoinRoomAck, JoinRoomPayload } from '../../types/websocket';
import { WebsocketEventsService } from './websocket.events.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class WidgetChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly websocketEventsService: WebsocketEventsService) {}

  afterInit(server: Server): void {
    this.websocketEventsService.bindServer(server);
  }

  handleConnection(client: Socket): void {
    this.websocketEventsService.onConnect(client.id);
  }

  handleDisconnect(client: Socket): void {
    this.websocketEventsService.onDisconnect(client.id);
  }

  @SubscribeMessage(WebSocketEvents.JOIN_ROOM)
  async joinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<JoinRoomAck> {
    return this.websocketEventsService.joinRoom(payload, client);
  }
}
