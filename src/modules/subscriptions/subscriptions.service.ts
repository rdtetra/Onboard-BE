import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../common/entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatus } from '../../types/subscription-status';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';
import { RoleName } from '../../types/roles';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async create(ctx: RequestContext, dto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create({
      organizationId: dto.orgId,
      planId: dto.planId,
      status: dto.status,
      currentPeriodStart: new Date(dto.currentPeriodStart),
      currentPeriodEnd: new Date(dto.currentPeriodEnd),
      nextRenewalAt: dto.nextRenewalAt ? new Date(dto.nextRenewalAt) : null,
      providerSubscriptionId: dto.providerSubscriptionId ?? null,
    });
    return this.subscriptionRepository.save(subscription);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<Subscription>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const orgId =
      ctx.user.organizationId ?? (ctx.user.roleName === RoleName.SUPER_ADMIN ? undefined : null);
    if (orgId === null) {
      throw new BadRequestException('Organization context required');
    }
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const where: { organizationId?: string } = {};
    if (orgId) {
      where.organizationId = orgId;
    }
    const [data, total] = await this.subscriptionRepository.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: ['plan'],
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan', 'organization'],
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
    if (ctx?.user && ctx.user.organizationId && subscription.organizationId !== ctx.user.organizationId) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new NotFoundException(`Subscription with id ${id} not found`);
      }
    }
    return subscription;
  }

  async findCurrentForOrganization(ctx: RequestContext): Promise<Subscription | null> {
    const orgId = ctx.user?.organizationId;
    if (!orgId) {
      return null;
    }
    return this.subscriptionRepository.findOne({
      where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
      order: { currentPeriodEnd: 'DESC' },
      relations: ['plan'],
    });
  }

  async getCurrent(ctx: RequestContext): Promise<Subscription | null> {
    return this.findCurrentForOrganization(ctx);
  }

  async update(ctx: RequestContext, id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findOne(ctx, id);
    if (dto.orgId !== undefined) subscription.organizationId = dto.orgId;
    if (dto.planId !== undefined) subscription.planId = dto.planId;
    if (dto.status !== undefined) subscription.status = dto.status;
    if (dto.currentPeriodStart !== undefined) {
      subscription.currentPeriodStart = new Date(dto.currentPeriodStart);
    }
    if (dto.currentPeriodEnd !== undefined) {
      subscription.currentPeriodEnd = new Date(dto.currentPeriodEnd);
    }
    if (dto.nextRenewalAt !== undefined) {
      subscription.nextRenewalAt = dto.nextRenewalAt ? new Date(dto.nextRenewalAt) : null;
    }
    if (dto.providerSubscriptionId !== undefined) {
      subscription.providerSubscriptionId = dto.providerSubscriptionId ?? null;
    }
    return this.subscriptionRepository.save(subscription);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const subscription = await this.findOne(ctx, id);
    await this.subscriptionRepository.remove(subscription);
  }
}
