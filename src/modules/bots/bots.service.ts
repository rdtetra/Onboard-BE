import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotKbLinkService } from '../bot-kb-link/bot-kb-link.service';
import { BotTaskLinkService } from '../bot-task-link/bot-task-link.service';
import { BotWidgetLinkService } from '../bot-widget-link/bot-widget-link.service';
import { TokenWalletService } from '../token-wallet/token-wallet.service';
import { TokenTransactionsService } from '../token-transactions/token-transactions.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { BotType, Behavior, BotPriority } from '../../types/bot';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import type { BotsOverview, BotWithTokensUsed } from '../../types/bots-overview';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class BotsService {
  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly botKbLinkService: BotKbLinkService,
    private readonly botTaskLinkService: BotTaskLinkService,
    private readonly botWidgetLinkService: BotWidgetLinkService,
    private readonly tokenWalletService: TokenWalletService,
    private readonly tokenTransactionsService: TokenTransactionsService,
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

    const isProjectBot =
      createBotDto.botType === BotType.PROJECT ||
      createBotDto.botType === BotType.URL_SPECIFIC;
    const bot = this.botRepository.create({
      ...createBotDto,
      organizationId: ctx.user.organizationId,
      isActive: true,
      isArchived: false,
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

    const saved = await this.botRepository.save(bot);
    await this.botWidgetLinkService.createDefaultWidgetForBot(saved.id);
    const withWidget = await this.botRepository.findOne({
      where: { id: saved.id },
      relations: ['widget'],
    });
    return withWidget ?? saved;
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { botType?: BotType; search?: string },
  ): Promise<PaginatedResult<BotWithTokensUsed>> {
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
      relations: ['tasks', 'conversations'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const dataWithTokens = await this.attachTokensUsedToBots(
      orgId ?? undefined,
      data,
    );
    return toPaginatedResult(dataWithTokens, total, page, limit);
  }

  private async attachTokensUsedToBots(
    orgId: string | undefined,
    bots: Bot[],
  ): Promise<BotWithTokensUsed[]> {
    if (bots.length === 0 || !orgId) {
      return bots.map((b) => ({ ...b, tokensUsed: 0 }));
    }
    const wallet = await this.tokenWalletService.getByOrganizationId(orgId);
    if (!wallet) {
      return bots.map((b) => ({ ...b, tokensUsed: 0 }));
    }
    const usageRows = await this.tokenTransactionsService.getUsageByBotIds(
      wallet.id,
      bots.map((b) => b.id),
    );
    const usageByBotId = new Map(
      usageRows.map((r) => [r.botId, r.tokensUsed]),
    );
    return bots.map((b) => ({
      ...b,
      tokensUsed: usageByBotId.get(b.id) ?? 0,
    }));
  }

  /**
   * Overview stats for one bot or all org bots: active bots, conversations, messages, tokens used, KB sources.
   * When botId is provided, stats are scoped to that bot; otherwise to all bots in the org.
   */
  async getOverview(
    ctx: RequestContext,
    botId?: string,
  ): Promise<BotsOverview> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? undefined
        : ctx.user.organizationId;
    if (!orgId && ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new BadRequestException(
        'Organization context required for bots overview',
      );
    }

    let botIds: string[];
    if (botId) {
      const bot = await this.findOne(ctx, botId);
      botIds = [bot.id];
    } else {
      const where: FindOptionsWhere<Bot> = {};
      if (orgId) where.organizationId = orgId;
      const bots = await this.botRepository.find({
        where,
        select: ['id', 'isActive'],
      });
      botIds = bots.map((b) => b.id);
    }

    if (botIds.length === 0) {
      return {
        activeBots: 0,
        totalConversations: 0,
        totalMessages: 0,
        totalTokensUsed: 0,
        totalKbSources: 0,
      };
    }

    const [
      activeBots,
      totalConversations,
      totalMessages,
      totalTokensUsed,
      totalKbSources,
    ] = await Promise.all([
      this.botRepository.count({
        where: { id: In(botIds), isActive: true },
      }),
      this.conversationRepository.count({
        where: { botId: In(botIds) },
      }),
      this.messageRepository
        .createQueryBuilder('msg')
        .innerJoin('msg.conversation', 'c')
        .where('c.botId IN (:...botIds)', { botIds })
        .getCount(),
      orgId
        ? this.getTotalTokensUsedForBots(orgId, botIds)
        : Promise.resolve(0),
      this.getDistinctKbSourcesCountForBots(botIds),
    ]);

    return {
      activeBots,
      totalConversations,
      totalMessages,
      totalTokensUsed,
      totalKbSources,
    };
  }

  private async getTotalTokensUsedForBots(
    orgId: string,
    botIds: string[],
  ): Promise<number> {
    const wallet = await this.tokenWalletService.getByOrganizationId(orgId);
    if (!wallet) return 0;
    return this.tokenTransactionsService.getTotalUsageByBotIds(
      wallet.id,
      botIds,
    );
  }

  private async getDistinctKbSourcesCountForBots(botIds: string[]): Promise<number> {
    const result = await this.botRepository
      .createQueryBuilder('bot')
      .innerJoin('bot.kbSources', 'kb')
      .where('bot.id IN (:...botIds)', { botIds })
      .select('COUNT(DISTINCT kb.id)', 'count')
      .getRawOne<{ count: string }>();
    return Math.floor(parseFloat(result?.count ?? '0'));
  }

  /** Returns all bots the user can access (org-scoped), id and name only (e.g. for dropdowns). */
  async findOptions(
    ctx: RequestContext,
  ): Promise<{ id: string; name: string }[]> {
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
    const where: FindOptionsWhere<Bot> = {};
    if (orgId) where.organizationId = orgId;
    return this.botRepository.find({
      where,
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  /** Returns IDs of all bots the user can access (org-scoped). */
  async findOne(
    ctx: RequestContext,
    id: string,
    options?: { relations?: string[] },
  ): Promise<Bot> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const bot = await this.botRepository.findOne({
      where: { id },
      ...(options?.relations && { relations: options.relations }),
    });

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
    const bot = await this.findOne(ctx, id, { relations: ['widget'] });
    await this.botWidgetLinkService.removeWidgetForBot(bot);
    await this.botTaskLinkService.softRemoveTasksForBot(bot.id);
    await this.botRepository.softRemove(bot);
  }

  async archive(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.isArchived = true;
    return this.botRepository.save(bot);
  }

  async unarchive(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.isArchived = false;
    return this.botRepository.save(bot);
  }

  async disable(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.isActive = false;
    return this.botRepository.save(bot);
  }

  async enable(ctx: RequestContext, id: string): Promise<Bot> {
    const bot = await this.findOne(ctx, id);
    bot.isActive = true;
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

    if (
      botType === BotType.PROJECT ||
      botType === BotType.URL_SPECIFIC
    ) {
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
