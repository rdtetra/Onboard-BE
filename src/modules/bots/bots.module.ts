import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { BotWidgetToken } from '../../common/entities/bot-widget-token.entity';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { BotKbLinkModule } from '../bot-kb-link/bot-kb-link.module';
import { BotTaskLinkModule } from '../bot-task-link/bot-task-link.module';
import { BotWidgetLinkModule } from '../bot-widget-link/bot-widget-link.module';
import { TokenWalletModule } from '../token-wallet/token-wallet.module';
import { TokenTransactionsModule } from '../token-transactions/token-transactions.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bot, BotWidgetToken, Conversation, Message]),
    ConfigModule,
    BotKbLinkModule,
    BotTaskLinkModule,
    BotWidgetLinkModule,
    TokenWalletModule,
    TokenTransactionsModule,
    JwtWrapperModule,
  ],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
