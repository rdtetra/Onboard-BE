import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../../common/entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async create(ctx: RequestContext, dto: CreatePlanDto): Promise<Plan> {
    const plan = this.planRepository.create({
      key: dto.key ?? null,
      name: dto.name.trim(),
      monthlyPriceCents: dto.monthlyPriceCents,
      monthlyTokens: dto.monthlyTokens,
      storageLimitMb: dto.storageLimitMb,
      maxBots: dto.maxBots,
      features: dto.features ?? null,
    });
    return this.planRepository.save(plan);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<Plan>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [data, total] = await this.planRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    return plan;
  }

  async update(ctx: RequestContext, id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(ctx, id);
    if (dto.key !== undefined) plan.key = dto.key ?? null;
    if (dto.name !== undefined) plan.name = dto.name.trim();
    if (dto.monthlyPriceCents !== undefined) plan.monthlyPriceCents = dto.monthlyPriceCents;
    if (dto.monthlyTokens !== undefined) plan.monthlyTokens = dto.monthlyTokens;
    if (dto.storageLimitMb !== undefined) plan.storageLimitMb = dto.storageLimitMb;
    if (dto.maxBots !== undefined) plan.maxBots = dto.maxBots;
    if (dto.features !== undefined) plan.features = dto.features ?? null;
    return this.planRepository.save(plan);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const plan = await this.findOne(ctx, id);
    await this.planRepository.remove(plan);
  }
}
