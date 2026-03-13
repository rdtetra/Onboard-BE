import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenWallet } from '../../common/entities/token-wallet.entity';
import { CreateTokenWalletDto } from './dto/create-token-wallet.dto';
import { UpdateTokenWalletDto } from './dto/update-token-wallet.dto';
import type { RequestContext } from '../../types/request';
import { RoleName } from '../../types/roles';

@Injectable()
export class TokenWalletService {
  constructor(
    @InjectRepository(TokenWallet)
    private readonly walletRepository: Repository<TokenWallet>,
  ) {}

  async create(ctx: RequestContext, dto: CreateTokenWalletDto): Promise<TokenWallet> {
    const existing = await this.walletRepository.findOne({
      where: { organizationId: dto.orgId },
    });
    if (existing) {
      throw new ConflictException(
        'A token wallet already exists for this organization',
      );
    }
    const wallet = this.walletRepository.create({
      organizationId: dto.orgId,
      balance: dto.balance ?? 0,
    });
    return this.walletRepository.save(wallet);
  }

  async getByOrganizationId(orgId: string): Promise<TokenWallet | null> {
    return this.walletRepository.findOne({
      where: { organizationId: orgId },
    });
  }

  /** Find wallet by id only (no org check). For internal use when ctx is not available. */
  async findOneById(id: string): Promise<TokenWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!wallet) {
      throw new NotFoundException(`Token wallet with id ${id} not found`);
    }
    return wallet;
  }

  async getOrCreateForOrganization(orgId: string): Promise<TokenWallet> {
    let wallet = await this.getByOrganizationId(orgId);
    if (!wallet) {
      wallet = this.walletRepository.create({
        organizationId: orgId,
        balance: 0,
      });
      wallet = await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async findOne(ctx: RequestContext, id: string): Promise<TokenWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!wallet) {
      throw new NotFoundException(`Token wallet with id ${id} not found`);
    }
    if (
      ctx?.user &&
      ctx.user.organizationId &&
      wallet.organizationId !== ctx.user.organizationId
    ) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new NotFoundException(`Token wallet with id ${id} not found`);
      }
    }
    return wallet;
  }

  async getForCurrentOrg(ctx: RequestContext): Promise<TokenWallet | null> {
    if (!ctx.user?.organizationId) {
      return null;
    }
    return this.getByOrganizationId(ctx.user.organizationId);
  }

  async getOrCreateForCurrentOrg(ctx: RequestContext): Promise<TokenWallet> {
    if (!ctx.user?.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.getOrCreateForOrganization(ctx.user.organizationId);
  }

  async updateBalance(
    walletId: string,
    delta: number,
  ): Promise<TokenWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Token wallet with id ${walletId} not found`);
    }
    const newBalance = wallet.balance + delta;
    if (newBalance < 0) {
      throw new BadRequestException('Insufficient token balance');
    }
    wallet.balance = newBalance;
    return this.walletRepository.save(wallet);
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateTokenWalletDto,
  ): Promise<TokenWallet> {
    const wallet = await this.findOne(ctx, id);
    if (dto.balance !== undefined) wallet.balance = dto.balance;
    if (dto.orgId !== undefined) wallet.organizationId = dto.orgId;
    return this.walletRepository.save(wallet);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const wallet = await this.findOne(ctx, id);
    await this.walletRepository.remove(wallet);
  }
}
