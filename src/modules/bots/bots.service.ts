import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { BotType, BotState, DisplayMode } from '../../types/bot';
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
  ) {}

  private validateBotDto(dto: CreateBotDto | UpdateBotDto): void {
    const botType = dto.botType;
    const domains = dto.domains;
    const targetUrls = dto.targetUrls;

    if (botType === BotType.GENERAL) {
      if (domains != null && domains.length < 1) {
        throw new BadRequestException(
          'General bot must have at least one domain',
        );
      }
    }

    if (botType === BotType.URL_SPECIFIC) {
      if (domains != null && domains.length !== 1) {
        throw new BadRequestException(
          'URL-specific bot must have exactly one domain',
        );
      }
      if (targetUrls != null && targetUrls.length < 1) {
        throw new BadRequestException(
          'URL-specific bot must have at least one target URL',
        );
      }
    }
  }

  async create(ctx: RequestContext, createBotDto: CreateBotDto): Promise<Bot> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to create bots',
      );
    }

    this.validateBotDto(createBotDto);
    const bot = this.botRepository.create({
      ...createBotDto,
      organizationId: ctx.user.organizationId,
      state: BotState.ACTIVE,
      displayMode: createBotDto.displayMode ?? DisplayMode.AUTO_SHOW,
      description: createBotDto.description ?? null,
      introMessage: createBotDto.introMessage ?? null,
      targetUrls: createBotDto.targetUrls ?? [],
      visibilityDuration:
        createBotDto.botType === BotType.URL_SPECIFIC
          ? (createBotDto.visibilityDuration ?? null)
          : null,
      oncePerSession:
        createBotDto.botType === BotType.URL_SPECIFIC
          ? (createBotDto.oncePerSession ?? false)
          : false,
    });
    return this.botRepository.save(bot);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { botType?: BotType; search?: string; organizationId?: string },
  ): Promise<PaginatedResult<Bot>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? (filters?.organizationId ?? ctx.user.organizationId)
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

  async findByIds(ids: string[], organizationId?: string): Promise<Bot[]> {
    if (ids.length === 0) {
      return [];
    }

    const where: FindOptionsWhere<Bot> = { id: In(ids) };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.botRepository.find({ where });
  }

  async update(
    ctx: RequestContext,
    id: string,
    updateBotDto: UpdateBotDto,
  ): Promise<Bot> {
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
    if (updateBotDto.displayMode !== undefined) {
      payload.displayMode = updateBotDto.displayMode;
    }

    if (botType === BotType.URL_SPECIFIC) {
      if (updateBotDto.targetUrls !== undefined) {
        payload.targetUrls = updateBotDto.targetUrls;
      }
      if (updateBotDto.visibilityDuration !== undefined) {
        payload.visibilityDuration = updateBotDto.visibilityDuration;
      }
      if (updateBotDto.oncePerSession !== undefined) {
        payload.oncePerSession = updateBotDto.oncePerSession;
      }
    }

    return payload;
  }
}
