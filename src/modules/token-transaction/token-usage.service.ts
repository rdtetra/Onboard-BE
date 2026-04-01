import { Injectable, BadRequestException } from '@nestjs/common';
import { TokenWalletService } from '../token-wallet/token-wallet.service';
import { TokenTransactionService } from './token-transaction.service';
import { TokenTransaction } from '../../common/entities/token-transaction.entity';
import type { ConsumeTokensParams } from '../../types/token-usage';

/**
 * Deducts on user message (per turn); refunds on failed bot reply via matching credit row.
 */
@Injectable()
export class TokenUsageService {
  constructor(
    private readonly tokenWalletService: TokenWalletService,
    private readonly tokenTransactionsService: TokenTransactionService,
  ) {}

  /**
   * Deduct tokens from the organization's wallet and create a usage transaction
   * linked to the given bot and conversation.
   * @throws BadRequestException if amount is invalid or balance is insufficient
   */
  async consumeTokens(params: ConsumeTokensParams): Promise<TokenTransaction> {
    const { organizationId, botId, conversationId, amount, metadata } = params;

    if (amount <= 0) {
      throw new BadRequestException(
        'Token consumption amount must be positive',
      );
    }

    const wallet =
      await this.tokenWalletService.getOrCreateForOrganization(organizationId);

    return this.tokenTransactionsService.recordUsage(wallet.id, amount, {
      botId,
      conversationId,
      metadata: metadata ?? undefined,
    });
  }

  async refundTokens(params: ConsumeTokensParams): Promise<TokenTransaction> {
    const { organizationId, botId, conversationId, amount, metadata } = params;

    if (amount <= 0) {
      throw new BadRequestException(
        'Token refund amount must be positive',
      );
    }

    const wallet =
      await this.tokenWalletService.getOrCreateForOrganization(organizationId);

    return this.tokenTransactionsService.recordUsageRefund(wallet.id, amount, {
      botId,
      conversationId,
      metadata: metadata ?? undefined,
    });
  }
}
