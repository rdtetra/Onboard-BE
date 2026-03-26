import { Global, Module } from '@nestjs/common';
import { BotModule } from '../bot/bot.module';
import { ConversationModule } from '../conversation/conversation.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetChatGateway } from './websocket.gateway';
import { WebsocketEventsService } from './websocket.events.service';

@Global()
@Module({
  imports: [BotModule, ConversationModule, JwtWrapperModule],
  providers: [WidgetChatGateway, WebsocketEventsService],
  exports: [WebsocketEventsService],
})
export class WebsocketModule {}
