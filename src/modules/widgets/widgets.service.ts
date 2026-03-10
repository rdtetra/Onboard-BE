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
import { BotsService } from '../bots/bots.service';
import { BotWidgetLinkService } from '../bot-widget-link/bot-widget-link.service';
import { StorageService } from '../storage/storage.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { WidgetPosition, WidgetAppearance } from '../../types/widget';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class WidgetsService {
  constructor(
    @InjectRepository(Widget)
    private readonly widgetRepository: Repository<Widget>,
    private readonly botsService: BotsService,
    private readonly botWidgetLinkService: BotWidgetLinkService,
    private readonly storageService: StorageService,
  ) {}

  async create(ctx: RequestContext, dto: CreateWidgetDto): Promise<Widget> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const bot = await this.botsService.findOne(ctx, dto.botId, {
      relations: ['widget'],
    });
    if (bot.widget) {
      throw new ConflictException(
        'A widget configuration already exists for this bot',
      );
    }

    const widget = this.widgetRepository.create({
      botLogoUrl: dto.botLogoUrl ?? null,
      position: dto.position ?? WidgetPosition.BOTTOM_RIGHT,
      appearance: dto.appearance ?? WidgetAppearance.LIGHT,
      primaryColor: dto.primaryColor ?? '#000000',
      headerTextColor: dto.headerTextColor ?? '#000000',
      background: dto.background ?? '#ffffff',
      botMessageBg: dto.botMessageBg ?? '#f0f0f0',
      botMessageText: dto.botMessageText ?? '#000000',
      userMessageBg: dto.userMessageBg ?? '#007bff',
      userMessageText: dto.userMessageText ?? '#ffffff',
      headerText: dto.headerText ?? null,
      welcomeMessage: dto.welcomeMessage ?? null,
      showPoweredBy: dto.showPoweredBy ?? true,
    });
    const saved = await this.widgetRepository.save(widget);
    await this.botWidgetLinkService.setBotWidget(dto.botId, saved);
    const withBot = await this.widgetRepository.findOne({
      where: { id: saved.id },
      relations: ['bot'],
    });
    return withBot ?? saved;
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { botId?: string; search?: string },
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

  async findByBotId(ctx: RequestContext, botId: string): Promise<Widget | null> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const bot = await this.botsService.findOne(ctx, botId, {
      relations: ['widget'],
    });
    return bot.widget ?? null;
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateWidgetDto,
    logoFile?: Express.Multer.File,
  ): Promise<Widget> {
    const widget = await this.findOne(ctx, id);
    const { botId: _, ...rest } = dto;

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

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const widget = await this.findOne(ctx, id);
    if (widget.bot) {
      await this.botWidgetLinkService.unlinkWidgetFromBot(widget.bot.id);
    }
    await this.widgetRepository.softRemove(widget);
  }
}
