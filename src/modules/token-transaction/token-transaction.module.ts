import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenTransaction } from '../../common/entities/token-transaction.entity';
import { TokenTransactionService } from './token-transaction.service';
import { TokenTransactionController } from './token-transaction.controller';
import { TokenUsageService } from './token-usage.service';
import { TokenWalletModule } from '../token-wallet/token-wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([TokenTransaction]), TokenWalletModule],
  controllers: [TokenTransactionController],
  providers: [TokenTransactionService, TokenUsageService],
  exports: [TokenTransactionService, TokenUsageService],
})
export class TokenTransactionModule {}
