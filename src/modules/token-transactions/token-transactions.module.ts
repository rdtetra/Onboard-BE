import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenTransaction } from '../../common/entities/token-transaction.entity';
import { TokenTransactionsService } from './token-transactions.service';
import { TokenTransactionsController } from './token-transactions.controller';
import { TokenUsageService } from './token-usage.service';
import { TokenWalletModule } from '../token-wallet/token-wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([TokenTransaction]), TokenWalletModule],
  controllers: [TokenTransactionsController],
  providers: [TokenTransactionsService, TokenUsageService],
  exports: [TokenTransactionsService, TokenUsageService],
})
export class TokenTransactionsModule {}
