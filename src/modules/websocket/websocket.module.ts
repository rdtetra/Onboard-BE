import { Global, Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetChatGateway } from './websocket.gateway';
import { WebsocketEventsService } from './websocket.events.service';

@Global()
@Module({
  imports: [ConversationsModule, JwtWrapperModule],
  providers: [WidgetChatGateway, WebsocketEventsService],
  exports: [WebsocketEventsService],
})
export class WebsocketModule {}
