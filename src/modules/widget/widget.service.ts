import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Widget } from '../../common/entities/widget.entity';
import { BotService } from '../bot/bot.service';
import { BotWidgetLinkService } from '../bot-widget-link/bot-widget-link.service';
import { StorageService } from '../storage/storage.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { WidgetAppearance } from '../../types/widget';
import { DEFAULT_WIDGET_CONFIG } from '../../common/constants/widget-config';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class WidgetService {
  constructor(
    @InjectRepository(Widget)
    private readonly widgetRepository: Repository<Widget>,
    private readonly botsService: BotService,
    private readonly botWidgetLinkService: BotWidgetLinkService,
    private readonly storageService: StorageService,
  ) {}

  async create(ctx: RequestContext, dto: CreateWidgetDto): Promise<Widget> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const bot = await this.botsService.findOne(ctx, dto.botId, {
      relations: ['widgets'],
    });
    const existingForMode = (bot.widgets ?? []).find(
      (w) => w.mode === dto.mode,
    );
    if (existingForMode) {
      throw new ConflictException(
        `A ${dto.mode} widget already exists for this bot`,
      );
    }

    const d = DEFAULT_WIDGET_CONFIG;
    const widget = this.widgetRepository.create({
      botId: dto.botId,
      mode: dto.mode,
      botLogoUrl: dto.botLogoUrl ?? d.botLogoUrl,
      position: dto.position ?? d.position,
      primaryColor: dto.primaryColor ?? d.primaryColor,
      headerTextColor: dto.headerTextColor ?? d.headerTextColor,
      background: dto.background ?? d.background,
      botMessageBg: dto.botMessageBg ?? d.botMessageBg,
      botMessageText: dto.botMessageText ?? d.botMessageText,
      userMessageBg: dto.userMessageBg ?? d.userMessageBg,
      userMessageText: dto.userMessageText ?? d.userMessageText,
      headerText: dto.headerText ?? d.headerText,
      welcomeMessage: dto.welcomeMessage ?? d.welcomeMessage,
      showPoweredBy: dto.showPoweredBy ?? d.showPoweredBy,
    });
    const saved = await this.widgetRepository.save(widget);
    const withBot = await this.widgetRepository.findOne({
      where: { id: saved.id },
      relations: ['bot'],
    });
    return withBot ?? saved;
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { botId?: string; search?: string; mode?: WidgetAppearance },
  ): Promise<PaginatedResult<Widget>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? undefined
        : ctx.user.organizationId;
    if (!orgId && ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new UnauthorizedException(
        'Organization context required to list widgets',
      );
    }

    const { page, limit, skip } = parsePagination(pagination ?? {});

    const where: FindOptionsWhere<Widget> = {};
    where.bot = {};
    if (orgId) {
      where.bot.organizationId = orgId;
    }
    if (filters?.botId) {
      where.bot.id = filters.botId;
    }
    if (Object.keys(where.bot).length === 0) {
      delete where.bot;
    }
    if (filters?.mode) {
      where.mode = filters.mode;
    }
    if (filters?.search?.trim()) {
      where.headerText = ILike(`%${filters.search.trim()}%`);
    }

    const [data, total] = await this.widgetRepository.findAndCount({
      where,
      relations: ['bot'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Widget> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const widget = await this.widgetRepository.findOne({
      where: { id },
      relations: ['bot'],
    });
    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
    if (widget.bot) {
      await this.botsService.findOne(ctx, widget.bot.id);
    }
    return widget;
  }

  /**
   * Widget for a bot + appearance mode.
   * With `{ forWidget: true }` (embed): no user; token verified upstream.
   * Otherwise: authenticated; ensures org access to the bot.
   */
  async findByBotIdAndMode(
    ctx: RequestContext,
    botId: string,
    mode: string,
    options?: { forWidget?: boolean },
  ): Promise<Widget | null> {
    const normalized = mode?.trim().toLowerCase();
    if (
      normalized !== WidgetAppearance.LIGHT &&
      normalized !== WidgetAppearance.DARK
    ) {
      throw new BadRequestException('mode must be light or dark');
    }
    const appearance = normalized as WidgetAppearance;

    if (options?.forWidget) {
      return this.widgetRepository.findOne({
        where: { botId, mode: appearance },
        relations: ['bot'],
      });
    }

    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.botsService.findOne(ctx, botId);
    return this.widgetRepository.findOne({
      where: { botId, mode: appearance },
      relations: ['bot'],
    });
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateWidgetDto,
    logoFile?: Express.Multer.File,
  ): Promise<Widget> {
    const widget = await this.findOne(ctx, id);
    const { botId: discardedBotId, mode: discardedMode, ...rest } = dto;
    void discardedBotId;
    void discardedMode;

    if (logoFile) {
      try {
        rest.botLogoUrl = await this.storageService.uploadWidgetLogo(
          id,
          logoFile.buffer,
          logoFile.mimetype,
        );
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Logo upload failed',
        );
      }
    }

    Object.assign(widget, rest);
    return this.widgetRepository.save(widget);
  }

  /** Update the widget for a bot and mode. */
  async updateByBotIdAndMode(
    ctx: RequestContext,
    botId: string,
    mode: string,
    dto: UpdateWidgetDto,
    logoFile?: Express.Multer.File,
  ): Promise<Widget> {
    if (mode !== WidgetAppearance.LIGHT && mode !== WidgetAppearance.DARK) {
      throw new BadRequestException('Param "mode" must be light or dark');
    }
    const existing = await this.findByBotIdAndMode(ctx, botId, mode);
    if (existing) {
      return this.update(ctx, existing.id, dto, logoFile);
    }
    throw new NotFoundException(
      `No ${mode} widget found for this bot. Create it first or use widget id.`,
    );
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const widget = await this.findOne(ctx, id);
    await this.widgetRepository.remove(widget);
  }
}
