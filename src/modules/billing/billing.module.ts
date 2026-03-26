import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { TokenWalletModule } from '../token-wallet/token-wallet.module';
import { TokenTransactionModule } from '../token-transaction/token-transaction.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { BotModule } from '../bot/bot.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    SubscriptionModule,
    TokenWalletModule,
    TokenTransactionModule,
    KnowledgeBaseModule,
    BotModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
