import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenTransaction } from '../../common/entities/token-transaction.entity';
import { CreateTokenTransactionDto } from './dto/create-token-transaction.dto';
import { TokenWalletService } from '../token-wallet/token-wallet.service';
import { TokenTransactionType } from '../../types/token-transaction-type';
import { RequestContextId, type RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';
import { RoleName } from '../../types/roles';
import { createInternalContext } from '../../common/utils/request-context.util';

/** Used for usage/grant paths where there is no HTTP request (widget, jobs, etc.). */
const internalTokenTransactionsCtx: RequestContext = createInternalContext(
  RequestContextId.TOKEN_TRANSACTIONS_INTERNAL,
);

@Injectable()
export class TokenTransactionService {
  constructor(
    @InjectRepository(TokenTransaction)
    private readonly transactionRepository: Repository<TokenTransaction>,
    private readonly tokenWalletService: TokenWalletService,
  ) {}

  async create(
    ctx: RequestContext,
    dto: CreateTokenTransactionDto,
  ): Promise<TokenTransaction> {
    const wallet = await this.tokenWalletService.findOne(ctx, dto.walletId);
    const tx = this.transactionRepository.create({
      walletId: dto.walletId,
      type: dto.type,
      amount: dto.amount,
      botId: dto.botId ?? null,
      conversationId: dto.conversationId ?? null,
      metadata: dto.metadata ?? null,
    });
    const saved = await this.transactionRepository.save(tx);
    await this.tokenWalletService.updateBalance(wallet.id, dto.amount);
    return this.transactionRepository.findOne({
      where: { id: saved.id },
      relations: ['wallet'],
    }) as Promise<TokenTransaction>;
  }

  async recordUsage(
    walletId: string,
    amount: number,
    options: {
      botId?: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<TokenTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Usage amount must be positive');
    }
    return this.create(internalTokenTransactionsCtx, {
      walletId,
      type: TokenTransactionType.USAGE,
      amount: -amount,
      botId: options.botId ?? null,
      conversationId: options.conversationId ?? null,
      metadata: options.metadata ?? null,
    });
  }

  /** Credits the wallet; same USAGE type as spend so period totals use net SUM(-amount). */
  async recordUsageRefund(
    walletId: string,
    amount: number,
    options: {
      botId?: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<TokenTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }
    return this.create(internalTokenTransactionsCtx, {
      walletId,
      type: TokenTransactionType.USAGE,
      amount,
      botId: options.botId ?? null,
      conversationId: options.conversationId ?? null,
      metadata: options.metadata ?? null,
    });
  }

  async recordGrant(
    walletId: string,
    amount: number,
    metadata?: Record<string, unknown>,
  ): Promise<TokenTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Grant amount must be positive');
    }
    return this.create(internalTokenTransactionsCtx, {
      walletId,
      type: TokenTransactionType.SUBSCRIPTION_GRANT,
      amount,
      metadata: metadata ?? null,
    });
  }

  async findAllByWalletId(
    ctx: RequestContext,
    walletId: string,
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<TokenTransaction>> {
    const wallet = await this.tokenWalletService.findOne(ctx, walletId);
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: ['wallet'],
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findForCurrentOrg(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<TokenTransaction>> {
    if (!ctx.user?.organizationId) {
      throw new UnauthorizedException('Organization context required');
    }
    const wallet = await this.tokenWalletService.getOrCreateForOrganization(
      ctx.user.organizationId,
    );
    return this.findAllByWalletId(ctx, wallet.id, pagination);
  }

  async findOne(ctx: RequestContext, id: string): Promise<TokenTransaction> {
    const tx = await this.transactionRepository.findOne({
      where: { id },
      relations: ['wallet', 'bot', 'conversation'],
    });
    if (!tx) {
      throw new NotFoundException(`Token transaction with id ${id} not found`);
    }
    if (
      ctx.user &&
      ctx.user.organizationId &&
      tx.wallet.organizationId !== ctx.user.organizationId
    ) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new NotFoundException(
          `Token transaction with id ${id} not found`,
        );
      }
    }
    return tx;
  }

  /** Net USAGE for a wallet in a date range (debits negative, refunds positive). */
  async getUsageSumForWalletInPeriod(
    walletId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(-tx.amount), 0)', 'sum')
      .where('tx.wallet_id = :walletId', { walletId })
      .andWhere('tx.type = :type', { type: TokenTransactionType.USAGE })
      .andWhere('tx.created_at >= :periodStart', { periodStart })
      .andWhere('tx.created_at <= :periodEnd', { periodEnd })
      .getRawOne<{ sum: string }>();
    return Math.max(0, Math.floor(parseFloat(result?.sum ?? '0')));
  }

  /** Net USAGE for a wallet, filtered by bot IDs. */
  async getTotalUsageByBotIds(
    walletId: string,
    botIds: string[],
  ): Promise<number> {
    if (botIds.length === 0) return 0;
    const result = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(-tx.amount), 0)', 'sum')
      .where('tx.wallet_id = :walletId', { walletId })
      .andWhere('tx.type = :type', { type: TokenTransactionType.USAGE })
      .andWhere('tx.bot_id IN (:...botIds)', { botIds })
      .getRawOne<{ sum: string }>();
    return Math.max(0, Math.floor(parseFloat(result?.sum ?? '0')));
  }

  /** Net USAGE per bot for a wallet, for the given bot IDs (all time). */
  async getUsageByBotIds(
    walletId: string,
    botIds: string[],
  ): Promise<{ botId: string; tokensUsed: number }[]> {
    if (botIds.length === 0) return [];
    const rows = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('tx.bot_id', 'botId')
      .addSelect('SUM(-tx.amount)', 'tokensUsed')
      .where('tx.wallet_id = :walletId', { walletId })
      .andWhere('tx.type = :type', { type: TokenTransactionType.USAGE })
      .andWhere('tx.bot_id IN (:...botIds)', { botIds })
      .groupBy('tx.bot_id')
      .getRawMany<{ botId: string; tokensUsed: string }>();
    return rows.map((row) => ({
      botId: row.botId,
      tokensUsed: Math.max(
        0,
        Math.floor(parseFloat(row.tokensUsed ?? '0')),
      ),
    }));
  }

  /** Net USAGE by bot for a wallet, optionally in a date range. */
  async getUsageByBotForWalletInPeriod(
    walletId: string,
    options?: { periodStart?: Date; periodEnd?: Date },
  ): Promise<
    { botId: string | null; botName: string | null; tokensUsed: number }[]
  > {
    const qb = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoin('tx.bot', 'bot')
      .select('tx.bot_id', 'botId')
      .addSelect('bot.name', 'botName')
      .addSelect('SUM(-tx.amount)', 'tokensUsed')
      .where('tx.wallet_id = :walletId', { walletId })
      .andWhere('tx.type = :type', { type: TokenTransactionType.USAGE })
      .groupBy('tx.bot_id')
      .addGroupBy('bot.name');

    if (options?.periodStart) {
      qb.andWhere('tx.created_at >= :periodStart', {
        periodStart: options.periodStart,
      });
    }
    if (options?.periodEnd) {
      qb.andWhere('tx.created_at <= :periodEnd', {
        periodEnd: options.periodEnd,
      });
    }

    const rows = await qb.getRawMany<{
      botId: string | null;
      botName: string | null;
      tokensUsed: string;
    }>();

    return rows.map((row) => ({
      botId: row.botId,
      botName: row.botName ?? null,
      tokensUsed: Math.max(
        0,
        Math.floor(parseFloat(row.tokensUsed ?? '0')),
      ),
    }));
  }
}
