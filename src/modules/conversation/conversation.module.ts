import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { BotModule } from '../bot/bot.module';
import { TokenTransactionModule } from '../token-transaction/token-transaction.module';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    BotModule,
    TokenTransactionModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
