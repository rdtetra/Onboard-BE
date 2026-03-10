import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { BotsModule } from '../bots/bots.module';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    BotsModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
