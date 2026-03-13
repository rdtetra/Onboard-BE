import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenWallet } from '../../common/entities/token-wallet.entity';
import { TokenWalletService } from './token-wallet.service';
import { TokenWalletController } from './token-wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TokenWallet])],
  controllers: [TokenWalletController],
  providers: [TokenWalletService],
  exports: [TokenWalletService],
})
export class TokenWalletModule {}
