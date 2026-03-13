import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TokenWalletModule } from '../token-wallet/token-wallet.module';
import { TokenTransactionsModule } from '../token-transactions/token-transactions.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { BotsModule } from '../bots/bots.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    SubscriptionsModule,
    TokenWalletModule,
    TokenTransactionsModule,
    KnowledgeBaseModule,
    BotsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
