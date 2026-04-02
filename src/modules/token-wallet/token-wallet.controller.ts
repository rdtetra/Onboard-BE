import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TokenWalletService } from './token-wallet.service';
import { CreateTokenWalletDto } from './dto/create-token-wallet.dto';
import { UpdateTokenWalletDto } from './dto/update-token-wallet.dto';
import { TokenWallet } from '../../common/entities/token-wallet.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { RequestContext as RequestContextType } from '../../types/request';

@Controller('token-wallet')
export class TokenWalletController {
  constructor(private readonly tokenWalletService: TokenWalletService) {}

  @Post()
  @Allow(Permission.READ_TOKEN_WALLET)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateTokenWalletDto,
  ): Promise<TokenWallet> {
    return this.tokenWalletService.create(ctx, dto);
  }

  @Get('current')
  @Allow(Permission.READ_TOKEN_WALLET)
  getForCurrentOrg(
    @RequestContext() ctx: RequestContextType,
  ): Promise<TokenWallet | null> {
    return this.tokenWalletService.getForCurrentOrg(ctx);
  }

  @Get('current-or-create')
  @Allow(Permission.READ_TOKEN_WALLET)
  getOrCreateForCurrentOrg(
    @RequestContext() ctx: RequestContextType,
  ): Promise<TokenWallet> {
    return this.tokenWalletService.getOrCreateForCurrentOrg(ctx);
  }

  @Get(':id')
  @Allow(Permission.READ_TOKEN_WALLET)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<TokenWallet> {
    return this.tokenWalletService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.READ_TOKEN_WALLET)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdateTokenWalletDto,
  ): Promise<TokenWallet> {
    return this.tokenWalletService.update(ctx, id, dto);
  }

  @Delete(':id')
  @Allow(Permission.READ_TOKEN_WALLET)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tokenWalletService.remove(ctx, id);
  }
}
