import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { BotWidgetToken } from '../../common/entities/bot-widget-token.entity';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotKbLinkService } from '../bot-kb-link/bot-kb-link.service';
import { BotWidgetLinkService } from '../bot-widget-link/bot-widget-link.service';
import { TokenWalletService } from '../token-wallet/token-wallet.service';
import { TokenTransactionService } from '../token-transaction/token-transaction.service';
import { ConfigService } from '@nestjs/config';
import { JwtWrapperService } from '../jwt/jwt.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { BotType, Behavior, BotPriority } from '../../common/enums/bot.enum';
import { RoleName } from '../../common/enums/roles.enum';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import type {
  BotsOverview,
  BotWithTokensUsed,
  OverviewConversationDay,
} from '../../types/bots-overview';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class BotService {
  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    @InjectRepository(BotWidgetToken)
    private readonly botWidgetTokenRepository: Repository<BotWidgetToken>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly botKbLinkService: BotKbLinkService,
    private readonly botWidgetLinkService: BotWidgetLinkService,
    private readonly tokenWalletService: TokenWalletService,
    private readonly tokenTransactionsService: TokenTransactionService,
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly configService: ConfigService,
  ) {}

  getEmbedScriptTag(backendUrl: string, widgetToken: string): string {
    const base = backendUrl.replace(/\/$/, '');
    const src = `${base}/embed/embed.js`;
    const escaped = widgetToken.replace(/"/g, '&quot;');
    return `<script src="${src}" data-token="${escaped}" data-backend-url="${base}"></script>`;
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

    const orgId = ctx.user.organizationId;

    let parentRef: { id: string } | null = null;

    if (createBotDto.botType === BotType.PROJECT) {
      const parentId = createBotDto.parentBotId?.trim();
      if (!parentId) {
        throw new BadRequestException(
          'Project bots must have a parent general bot (parentBotId is required)',
        );
      }
      const parent = await this.findOne(ctx, parentId);
      if (parent.organizationId !== orgId) {
        throw new BadRequestException(
          'parentBot not found in this organization',
        );
      }
      if (parent.botType !== BotType.GENERAL) {
        throw new BadRequestException('parentBot must be a general bot');
      }
      parentRef = { id: parent.id };
    }

    const isProjectBot = createBotDto.botType !== BotType.GENERAL;
    const domains = createBotDto.domains ?? [];
    if (createBotDto.botType === BotType.GENERAL) {
      await this.assertNoGeneralDomainConflicts(orgId, domains);
    }

    const behavior = isProjectBot
      ? (createBotDto.behavior ?? Behavior.AUTO_SHOW)
      : null;
    const priority = isProjectBot
      ? (createBotDto.priority ?? BotPriority.MEDIUM)
      : null;
    const targetUrls = isProjectBot ? (createBotDto.targetUrls ?? []) : [];
    const oncePerSession = isProjectBot
      ? (createBotDto.oncePerSession ?? false)
      : false;
    const visibilityStartDate = isProjectBot
      ? new Date(createBotDto.visibilityStartDate!)
      : null;
    const visibilityEndDate = isProjectBot
      ? new Date(createBotDto.visibilityEndDate!)
      : null;

    const bot = this.botRepository.create({
      botType: createBotDto.botType,
      name: createBotDto.name,
      description: createBotDto.description ?? null,
      introMessage: createBotDto.introMessage ?? null,
      domains,
      organizationId: orgId,
      isActive: true,
      isArchived: false,
      parentBot: parentRef,
      behavior,
      priority,
      targetUrls,
      oncePerSession,
      visibilityStartDate,
      visibilityEndDate,
    });

    const saved = await this.botRepository.save(bot);

    await this.botWidgetLinkService.createDefaultWidgetForBot(saved.id);

    const withWidgets = await this.botRepository.findOne({
      where: { id: saved.id },
      relations: ['widgets'],
    });

    return withWidgets ?? saved;
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
      relations: ['tasks', 'conversations', 'parentBot'],
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

  /**
   * Overview stats for one bot or all org bots: active bots, conversations, messages, tokens used, KB sources.
   * When botId is provided, stats are scoped to that bot; otherwise to all bots in the org.
   * When period is provided (7days | 30days | 90days), includes conversationsOverTime buckets.
   */
  async getOverview(
    ctx: RequestContext,
    botId?: string,
    period?: string,
  ): Promise<BotsOverview> {
    const botIds = await this.getOverviewScopedBotIds(ctx, botId);

    const emptyOverview = (): BotsOverview => ({
      activeBots: 0,
      totalConversations: 0,
      totalMessages: 0,
      totalTokensUsed: 0,
      totalKbSources: 0,
    });

    if (!ctx.user) {
      throw new UnauthorizedException('Authentication required');
    }
    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? undefined
        : ctx.user.organizationId;

    if (botIds.length === 0) {
      const base = emptyOverview();
      if (period?.trim()) {
        const days = this.parseOverviewPeriod(period);
        return {
          ...base,
          conversationsOverTime: this.conversationCountsForEmptyScope(days),
        };
      }
      return base;
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

    const base: BotsOverview = {
      activeBots,
      totalConversations,
      totalMessages,
      totalTokensUsed,
      totalKbSources,
    };

    if (period?.trim()) {
      const days = this.parseOverviewPeriod(period);
      return {
        ...base,
        conversationsOverTime: await this.buildConversationCountsByDay(
          botIds,
          days,
        ),
      };
    }

    return base;
  }

  /** Daily conversation counts for charts (used by overview when period is set). */
  async getOverviewConversationsOverTime(
    ctx: RequestContext,
    period: string,
    botId?: string,
  ): Promise<OverviewConversationDay[]> {
    const days = this.parseOverviewPeriod(period);
    const botIds = await this.getOverviewScopedBotIds(ctx, botId);
    if (botIds.length === 0) {
      return this.conversationCountsForEmptyScope(days);
    }
    return this.buildConversationCountsByDay(botIds, days);
  }

  private async getOverviewScopedBotIds(
    ctx: RequestContext,
    botId?: string,
  ): Promise<string[]> {
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

    if (botId?.trim()) {
      const bot = await this.findOne(ctx, botId.trim());
      return [bot.id];
    }

    const where: FindOptionsWhere<Bot> = {};
    if (orgId) where.organizationId = orgId;
    const bots = await this.botRepository.find({
      where,
      select: ['id', 'isActive'],
    });
    return bots.map((b) => b.id);
  }

  private parseOverviewPeriod(period: string): number {
    const p = period?.trim();
    if (!p) {
      throw new BadRequestException(
        'period is required (7days, 30days, or 90days)',
      );
    }
    if (p === '7days') return 7;
    if (p === '30days') return 30;
    if (p === '90days') return 90;
    throw new BadRequestException(
      'period must be one of: 7days, 30days, 90days',
    );
  }

  private utcDayStart(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private conversationCountsForEmptyScope(days: number): Array<{
    date: string;
    count: number;
  }> {
    const now = new Date();
    const endExclusive = this.utcDayStart(now);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const startInclusive = this.utcDayStart(now);
    startInclusive.setUTCDate(startInclusive.getUTCDate() - (days - 1));
    return this.fillDailySeries(startInclusive, endExclusive, new Map());
  }

  private fillDailySeries(
    startInclusive: Date,
    endExclusive: Date,
    counts: Map<string, number>,
  ): Array<{ date: string; count: number }> {
    const out: Array<{ date: string; count: number }> = [];
    const cur = new Date(startInclusive);
    while (cur < endExclusive) {
      const key = cur.toISOString().slice(0, 10);
      out.push({ date: key, count: counts.get(key) ?? 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }

  private async buildConversationCountsByDay(
    botIds: string[],
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const now = new Date();
    const endExclusive = this.utcDayStart(now);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const startInclusive = this.utcDayStart(now);
    startInclusive.setUTCDate(startInclusive.getUTCDate() - (days - 1));

    const rows: Array<{ day: string; count: string | number }> =
      await this.conversationRepository.query(
        `SELECT (c.created_at AT TIME ZONE 'UTC')::date::text AS day,
                COUNT(*)::int AS count
           FROM conversations c
          WHERE c.bot_id = ANY($1)
            AND c.created_at >= $2
            AND c.created_at < $3
          GROUP BY (c.created_at AT TIME ZONE 'UTC')::date
          ORDER BY 1 ASC`,
        [botIds, startInclusive, endExclusive],
      );

    const map = new Map<string, number>();
    for (const r of rows) {
      const c =
        typeof r.count === 'number' ? r.count : parseInt(String(r.count), 10);
      map.set(r.day, Number.isFinite(c) ? c : 0);
    }

    return this.fillDailySeries(startInclusive, endExclusive, map);
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

  /** Total bot count for current scope (all for super admin, org for tenant). Excludes soft-deleted. */
  async countAll(ctx: RequestContext): Promise<number> {
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
    return this.botRepository.count({ where });
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    options?: { relations?: string[]; forWidget?: boolean },
  ): Promise<Bot> {
    if (options?.forWidget) {
      const bot = await this.findOneForWidget(ctx, id, options);
      return bot;
    }

    const relations = options?.relations?.length
      ? [...new Set([...options.relations, 'parentBot'])]
      : ['parentBot'];
    const bot = await this.botRepository.findOne({
      where: { id },
      relations,
    });

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (
      ctx.user.roleName !== RoleName.SUPER_ADMIN &&
      bot.organizationId !== ctx.user.organizationId
    ) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    return bot;
  }

  private async findOneForWidget(
    ctx: RequestContext,
    id: string,
    options?: { relations?: string[] },
  ): Promise<Bot> {
    void ctx;
    const relations = options?.relations?.length
      ? [...new Set([...options.relations, 'parentBot'])]
      : ['parentBot'];
    const bot = await this.botRepository.findOne({
      where: { id },
      relations,
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    if (bot.isArchived) {
      throw new UnauthorizedException('Bot is archived');
    }
    if (!bot.isActive) {
      throw new UnauthorizedException('Bot is disabled');
    }

    return bot;
  }

  async findActiveChildBotsByParentIdForWidget(ctx: RequestContext, parentBotId: string): Promise<Bot[]> {
    return this.botRepository.find({
      where: {
        parentBot: { id: parentBotId },
        isActive: true,
        isArchived: false,
      },
      relations: ['parentBot'],
      order: { createdAt: 'ASC' },
    });
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

    if (bot.botType === BotType.GENERAL) {
      bot.parentBot = null;
    }

    if (updateBotDto.parentBotId !== undefined) {
      if (bot.botType === BotType.GENERAL) {
        throw new BadRequestException(
          'parentBot can only be set on project bots',
        );
      }
      const rawParentId = updateBotDto.parentBotId;
      const cleared =
        rawParentId === null ||
        rawParentId === undefined ||
        (typeof rawParentId === 'string' && !String(rawParentId).trim());
      if (cleared) {
        if (
          bot.botType === BotType.PROJECT ||
          bot.botType === BotType.URL_SPECIFIC
        ) {
          throw new BadRequestException(
            'Project bots must have a parent general bot; parentBotId cannot be cleared',
          );
        }
        bot.parentBot = null;
      } else {
        const parent = await this.findOne(ctx, String(rawParentId).trim());
        if (parent.organizationId !== bot.organizationId) {
          throw new BadRequestException(
            'parentBot not found in this organization',
          );
        }
        if (parent.botType !== BotType.GENERAL) {
          throw new BadRequestException('parentBot must be a general bot');
        }
        bot.parentBot = parent;
      }
    }

    const payload = this.getUpdatePayload(bot, updateBotDto);
    Object.assign(bot, payload);
    if (bot.botType === BotType.GENERAL && updateBotDto.domains !== undefined) {
      if (!bot.organizationId) {
        throw new BadRequestException(
          'Organization context required to update general bot domains',
        );
      }
      await this.assertNoGeneralDomainConflicts(
        bot.organizationId,
        bot.domains ?? [],
        bot.id,
      );
    }
    if (bot.botType === BotType.PROJECT && bot.domains?.length !== 1) {
      throw new BadRequestException('Project bot must have exactly one domain');
    }
    if (bot.botType === BotType.PROJECT || bot.botType === BotType.URL_SPECIFIC) {
      const parentId =
        bot.parentBot &&
        (typeof bot.parentBot === 'object' ? bot.parentBot.id : null);
      if (!parentId) {
        throw new BadRequestException(
          'Project bots must have a parent general bot',
        );
      }
    }
    return this.botRepository.save(bot);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const bot = await this.findOne(ctx, id);
    await this.botRepository.remove(bot);
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
    if (bot.botType === BotType.GENERAL) {
      if (!bot.organizationId) {
        throw new BadRequestException(
          'Organization context required to enable general bot',
        );
      }
      await this.assertNoGeneralDomainConflicts(
        bot.organizationId,
        bot.domains ?? [],
        bot.id,
      );
    }
    bot.isActive = true;
    return this.botRepository.save(bot);
  }

  async createWidgetToken(
    ctx: RequestContext,
    id: string,
    options?: { name?: string },
  ): Promise<{ widgetToken: string; expiresAt: string; scriptTag: string }> {
    const bot = await this.findOne(ctx, id);
    if (bot.botType !== BotType.GENERAL) {
      throw new ForbiddenException(
        'Widget API tokens can only be created for general bots',
      );
    }
    const { token, expiresAt } = this.jwtWrapperService.signWithExpiresAt(
      { botId: id, type: 'widget' },
      'widget',
    );
    await this.botWidgetTokenRepository.save(
      this.botWidgetTokenRepository.create({
        botId: id,
        token,
        expiresAt: new Date(expiresAt),
        name: options?.name ?? null,
      }),
    );
    const baseUrl = (this.configService.get<string>('API_URL') ?? '')
      .trim()
      .replace(/\/$/, '');
    const scriptTag = this.getEmbedScriptTag(baseUrl, token);
    return {
      widgetToken: token,
      expiresAt,
      scriptTag,
    };
  }

  async findWidgetTokens(
    ctx: RequestContext,
    botId: string,
  ): Promise<(BotWidgetToken & { scriptTag: string })[]> {
    await this.findOne(ctx, botId);
    const tokens = await this.botWidgetTokenRepository.find({
      where: { botId },
      order: { createdAt: 'DESC' },
    });
    const baseUrl = (this.configService.get<string>('API_URL') ?? '')
      .trim()
      .replace(/\/$/, '');
    return tokens.map((record) => ({
      ...record,
      scriptTag: this.getEmbedScriptTag(baseUrl, record.token),
    }));
  }

  async removeWidgetToken(
    ctx: RequestContext,
    botId: string,
    tokenId: string,
  ): Promise<void> {
    await this.findOne(ctx, botId);
    const record = await this.botWidgetTokenRepository.findOne({
      where: { id: tokenId, botId },
    });
    if (!record) {
      throw new NotFoundException('Widget token not found');
    }
    await this.botWidgetTokenRepository.remove(record);
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
    const usageByBotId = new Map(usageRows.map((r) => [r.botId, r.tokensUsed]));
    return bots.map((b) => ({
      ...b,
      tokensUsed: usageByBotId.get(b.id) ?? 0,
    }));
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

  private async getDistinctKbSourcesCountForBots(
    botIds: string[],
  ): Promise<number> {
    const result = await this.botRepository
      .createQueryBuilder('bot')
      .innerJoin('bot.kbSources', 'kb')
      .where('bot.id IN (:...botIds)', { botIds })
      .select('COUNT(DISTINCT kb.id)', 'count')
      .getRawOne<{ count: string }>();
    return Math.floor(parseFloat(result?.count ?? '0'));
  }

  private async assertNoGeneralDomainConflicts(
    organizationId: string,
    domains: string[],
    excludeBotId?: string,
  ): Promise<void> {
    const normalizedRequested = new Set(
      (domains ?? [])
        .map((domain) => domain?.trim().toLowerCase())
        .filter((domain): domain is string => Boolean(domain)),
    );

    if (normalizedRequested.size === 0) {
      return;
    }

    const generalBots = await this.botRepository.find({
      where: {
        organizationId,
        botType: BotType.GENERAL,
        isActive: true,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        domains: true,
      },
    });

    const conflictingDomains = new Set<string>();
    for (const existingBot of generalBots) {
      if (excludeBotId && existingBot.id === excludeBotId) {
        continue;
      }
      for (const existingDomain of existingBot.domains ?? []) {
        const normalizedExisting = existingDomain?.trim().toLowerCase();
        if (normalizedExisting && normalizedRequested.has(normalizedExisting)) {
          conflictingDomains.add(existingDomain);
        }
      }
    }

    if (conflictingDomains.size > 0) {
      throw new BadRequestException(
        `A general bot with domain(s) ${Array.from(conflictingDomains).join(', ')} already exists`,
      );
    }
  }

  private getUpdatePayload(
    existingBot: Bot,
    updateBotDto: Partial<CreateBotDto>,
  ): Partial<Bot> {
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

    if (existingBot.botType !== BotType.GENERAL) {
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
