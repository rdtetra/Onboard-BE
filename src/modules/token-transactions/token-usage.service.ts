import { Injectable, BadRequestException } from '@nestjs/common';
import { TokenWalletService } from '../token-wallet/token-wallet.service';
import { TokenTransactionsService } from './token-transactions.service';
import { TokenTransaction } from '../../common/entities/token-transaction.entity';
import type { ConsumeTokensParams } from '../../types/token-usage';

/**
 * Handles token consumption when a bot sends a response: deducts from the
 * organization's wallet and creates a USAGE transaction linked to bot and conversation.
 */
@Injectable()
export class TokenUsageService {
  constructor(
    private readonly tokenWalletService: TokenWalletService,
    private readonly tokenTransactionsService: TokenTransactionsService,
  ) {}

  /**
   * Deduct tokens from the organization's wallet and create a usage transaction
   * linked to the given bot and conversation.
   * @throws BadRequestException if amount is invalid or balance is insufficient
   */
  async consumeTokens(params: ConsumeTokensParams): Promise<TokenTransaction> {
    const { organizationId, botId, conversationId, amount, metadata } = params;
    console.log(params, 'hi');

    if (amount <= 0) {
      throw new BadRequestException(
        'Token consumption amount must be positive',
      );
    }

    const wallet =
      await this.tokenWalletService.getOrCreateForOrganization(organizationId);

    console.log(wallet, 'hi6');

    return this.tokenTransactionsService.recordUsage(wallet.id, amount, {
      botId,
      conversationId,
      metadata: metadata ?? undefined,
    });
  }
}
