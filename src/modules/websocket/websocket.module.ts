import { Global, Module } from '@nestjs/common';
import { WidgetChatGateway } from './websocket.gateway';
import { WebsocketEventsService } from './websocket.events.service';

@Global()
@Module({
  providers: [WidgetChatGateway, WebsocketEventsService],
  exports: [WebsocketEventsService],
})
export class WebsocketModule {}
