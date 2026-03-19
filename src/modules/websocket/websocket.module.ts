import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../common/entities/conversation.entity';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetChatGateway } from './websocket.gateway';
import { WebsocketEventsService } from './websocket.events.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Conversation]), JwtWrapperModule],
  providers: [WidgetChatGateway, WebsocketEventsService],
  exports: [WebsocketEventsService],
})
export class WebsocketModule {}
