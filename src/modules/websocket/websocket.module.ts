import { Global, Module } from '@nestjs/common';
import { BotsModule } from '../bots/bots.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetChatGateway } from './websocket.gateway';
import { WebsocketEventsService } from './websocket.events.service';

@Global()
@Module({
  imports: [BotsModule, ConversationsModule, JwtWrapperModule],
  providers: [WidgetChatGateway, WebsocketEventsService],
  exports: [WebsocketEventsService],
})
export class WebsocketModule {}
