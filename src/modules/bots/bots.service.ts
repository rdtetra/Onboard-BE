import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotKbLinkService } from '../bot-kb-link/bot-kb-link.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { BotType, BotState, Behavior, BotPriority } from '../../types/bot';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class BotsService {
  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    private readonly botKbLinkService: BotKbLinkService,
  ) {}

  async create(ctx: RequestContext, createBotDto: CreateBotDto): Promise<Bot> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to create bots',
      );
    }

    const isProjectBot = createBotDto.botType === BotType.PROJECT;
    const bot = this.botRepository.create({
      ...createBotDto,
      organizationId: ctx.user.organizationId,
      state: BotState.ACTIVE,
      behavior: isProjectBot
        ? (createBotDto.behavior ?? Behavior.AUTO_SHOW)
        : null,
      priority: isProjectBot
        ? (createBotDto.priority ?? BotPriority.MEDIUM)
        : null,
      description: createBotDto.description ?? null,
      introMessage: createBotDto.introMessage ?? null,
      targetUrls: isProjectBot ? (createBotDto.targetUrls ?? []) : [],
      oncePerSession: isProjectBot
        ? (createBotDto.oncePerSession ?? false)
        : false,
      visibilityStartDate: isProjectBot
        ? new Date(createBotDto.visibilityStartDate!)
        : null,
      visibilityEndDate: isProjectBot
        ? new Date(createBotDto.visibilityEndDate!)
        : null,
    });

    return this.botRepository.save(bot);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { botType?: BotType; search?: string },
  ): Promise<PaginatedResult<Bot>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? undefined
        : ctx.user.organizationId;

    if (!orgId && ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new BadRequestException(
        'Organization context required to list bots',
      );
    }

    const { page, limit, skip } = parsePagination(pagination ?? {});

    const where: FindOptionsWhere<Bot> = {};
    
    if (orgId) {
      where.organizationId = orgId;
    }
    
    if (filters?.botType) {
      where.botType = filters.botType;
    }
    
    if (filters?.search?.trim()) {
      where.name = ILike(`%${filters.search.trim()}%`);
    }
    
    const [data, total] = await this.botRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Bot> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    if (
      ctx.user.roleName !== RoleName.SUPER_ADMIN &&
      bot.organizationId !== ctx.user.organizationId
    ) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    return bot;
  }

  async findKbSources(ctx: RequestContext, botId: string): Promise<KBSource[]> {
    const bot = await this.botRepository.findOne({
      where: { id: botId },
      relations: ['kbSources'],
    });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }
    if (
      ctx.user?.roleName !== RoleName.SUPER_ADMIN &&
      bot.organizationId !== ctx.user?.organizationId
    ) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }
    return bot.kbSources ?? [];
  }

  async linkKbSource(
    ctx: RequestContext,
    botId: string,
    sourceId: string,
  ): Promise<KBSource> {
    return this.botKbLinkService.linkByIds(ctx, sourceId, botId);
  }

  async unlinkKbSource(
    ctx: RequestContext,
    botId: string,
    sourceId: string,
  ): Promise<KBSource> {
    return this.botKbLinkService.unlinkByIds(ctx, sourceId, botId);
  }

  async update(
    ctx: RequestContext,
    id: string,
    updateBotDto: UpdateBotDto,
  ): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
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

  async enable(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.state = BotState.ACTIVE;
    return this.botRepository.save(bot);
  }

  private getUpdatePayloadForType(
    existingBot: Bot,
    updateBotDto: Partial<CreateBotDto>,
  ): Partial<Bot> {
    const { botType } = existingBot;
    const payload: Partial<Bot> = {};

    if (updateBotDto.name !== undefined) {
      payload.name = updateBotDto.name;
    }
    if (updateBotDto.description !== undefined) {
      payload.description = updateBotDto.description;
    }
    if (updateBotDto.introMessage !== undefined) {
      payload.introMessage = updateBotDto.introMessage;
    }
    if (updateBotDto.domains !== undefined) {
      payload.domains = updateBotDto.domains;
    }

    if (botType === BotType.PROJECT) {
      if (updateBotDto.targetUrls !== undefined) {
        payload.targetUrls = updateBotDto.targetUrls;
      }
      if (updateBotDto.oncePerSession !== undefined) {
        payload.oncePerSession = updateBotDto.oncePerSession;
      }
      if (updateBotDto.behavior !== undefined) {
        payload.behavior = updateBotDto.behavior;
      }
      if (updateBotDto.priority !== undefined) {
        payload.priority = updateBotDto.priority;
      }
      if (updateBotDto.visibilityStartDate !== undefined) {
        payload.visibilityStartDate = updateBotDto.visibilityStartDate
          ? new Date(updateBotDto.visibilityStartDate)
          : null;
      }
      if (updateBotDto.visibilityEndDate !== undefined) {
        payload.visibilityEndDate = updateBotDto.visibilityEndDate
          ? new Date(updateBotDto.visibilityEndDate)
          : null;
      }
    }

    return payload;
  }
}
