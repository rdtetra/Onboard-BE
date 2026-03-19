import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
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

  constructor(private readonly websocketEventsService: WebsocketEventsService) {}

  handleConnection(client: Socket): void {
    this.websocketEventsService.onConnect(client.id);
  }

  handleDisconnect(client: Socket): void {
    this.websocketEventsService.onDisconnect(client.id);
  }
}
