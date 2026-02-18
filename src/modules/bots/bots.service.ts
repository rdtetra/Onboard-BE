import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { BotType, BotState } from '../../types/bot';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { parsePagination, toPaginatedResult } from '../../utils/pagination.util';

@Injectable()
export class BotsService {
  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
  ) {}

  private validateBotDto(dto: CreateBotDto | UpdateBotDto): void {
    const botType = dto.botType;
    const domains = dto.domains;
    const targetUrls = dto.targetUrls;

    if (botType === BotType.GENERAL) {
      if (domains != null && domains.length < 1) {
        throw new BadRequestException('General bot must have at least one domain');
      }
    }

    if (botType === BotType.URL_SPECIFIC) {
      if (domains != null && domains.length !== 1) {
        throw new BadRequestException('URL-specific bot must have exactly one domain');
      }
      if (targetUrls != null && targetUrls.length < 1) {
        throw new BadRequestException('URL-specific bot must have at least one target URL');
      }
    }
  }

  async create(ctx: RequestContext, createBotDto: CreateBotDto): Promise<Bot> {
    this.validateBotDto(createBotDto);
    const bot = this.botRepository.create({
      ...createBotDto,
      state: BotState.ACTIVE,
      description: createBotDto.description ?? null,
      targetUrls: createBotDto.targetUrls ?? [],
      visibilityDuration:
        createBotDto.botType === BotType.URL_SPECIFIC
          ? createBotDto.visibilityDuration ?? null
          : null,
      oncePerSession:
        createBotDto.botType === BotType.URL_SPECIFIC
          ? createBotDto.oncePerSession ?? false
          : false,
    });
    return this.botRepository.save(bot);
  }

  async findAll(
    ctx: RequestContext,
    filters?: { botType?: BotType; search?: string },
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<Bot>> {
    const where: FindOptionsWhere<Bot> = {};
    if (filters?.botType) where.botType = filters.botType;
    if (filters?.search?.trim()) {
      where.name = ILike(`%${filters.search.trim()}%`);
    }
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [data, total] = await this.botRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }
    return bot;
  }

  async update(ctx: RequestContext, id: string, updateBotDto: UpdateBotDto): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    const merged = { ...bot, ...updateBotDto, botType: bot.botType };
    this.validateBotDto(merged as CreateBotDto);
    const payload = this.getUpdatePayloadForType(bot, updateBotDto);
    Object.assign(bot, payload);
    return this.botRepository.save(bot);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const bot = await this.findOne(ctx, id);
    await this.botRepository.softRemove(bot);
  }

  async archive(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.state = BotState.ARCHIVED;
    return this.botRepository.save(bot);
  }

  async disable(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.state = BotState.DISABLED;
    return this.botRepository.save(bot);
  }

  private getUpdatePayloadForType(
    existingBot: Bot,
    updateBotDto: UpdateBotDto,
  ): Partial<Bot> {
    const { botType } = existingBot;
    const payload: Partial<Bot> = {};

    if (updateBotDto.name !== undefined) payload.name = updateBotDto.name;
    if (updateBotDto.description !== undefined) payload.description = updateBotDto.description;
    if (updateBotDto.domains !== undefined) payload.domains = updateBotDto.domains;

    if (botType === BotType.URL_SPECIFIC) {
      if (updateBotDto.targetUrls !== undefined) payload.targetUrls = updateBotDto.targetUrls;
      if (updateBotDto.visibilityDuration !== undefined) payload.visibilityDuration = updateBotDto.visibilityDuration;
      if (updateBotDto.oncePerSession !== undefined) payload.oncePerSession = updateBotDto.oncePerSession;
    }

    return payload;
  }
}
