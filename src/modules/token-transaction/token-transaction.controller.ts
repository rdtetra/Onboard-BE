import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TokenTransactionService } from './token-transaction.service';
import { CreateTokenTransactionDto } from './dto/create-token-transaction.dto';
import { TokenTransaction } from '../../common/entities/token-transaction.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('token-transactions')
export class TokenTransactionController {
  constructor(
    private readonly tokenTransactionsService: TokenTransactionService,
  ) {}

  @Post()
  @Allow(Permission.READ_TOKEN_TRANSACTION)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateTokenTransactionDto,
  ): Promise<TokenTransaction> {
    return this.tokenTransactionsService.create(ctx, dto);
  }

  @Get('my')
  @Allow(Permission.READ_TOKEN_TRANSACTION)
  findForCurrentOrg(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<TokenTransaction>> {
    return this.tokenTransactionsService.findForCurrentOrg(ctx, {
      page,
      limit,
    });
  }

  @Get('wallet/:walletId')
  @Allow(Permission.READ_TOKEN_TRANSACTION)
  findAllByWalletId(
    @RequestContext() ctx: RequestContextType,
    @Param('walletId') walletId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<TokenTransaction>> {
    return this.tokenTransactionsService.findAllByWalletId(ctx, walletId, {
      page,
      limit,
    });
  }

  @Get(':id')
  @Allow(Permission.READ_TOKEN_TRANSACTION)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<TokenTransaction> {
    return this.tokenTransactionsService.findOne(ctx, id);
  }
}
