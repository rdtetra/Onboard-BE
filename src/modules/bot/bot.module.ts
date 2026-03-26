import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { BotWidgetToken } from '../../common/entities/bot-widget-token.entity';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { BotKbLinkModule } from '../bot-kb-link/bot-kb-link.module';
import { BotWidgetLinkModule } from '../bot-widget-link/bot-widget-link.module';
import { TokenWalletModule } from '../token-wallet/token-wallet.module';
import { TokenTransactionModule } from '../token-transaction/token-transaction.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bot, BotWidgetToken, Conversation, Message]),
    ConfigModule,
    BotKbLinkModule,
    BotWidgetLinkModule,
    TokenWalletModule,
    TokenTransactionModule,
    JwtWrapperModule,
  ],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
