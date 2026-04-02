import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { SourceStatus } from '../../common/enums/knowledge-base.enum';
import { RoleName } from '../../common/enums/roles.enum';
import type { RequestContext } from '../../types/request';

/**
 * Single source of truth for bot ↔ KB source link/unlink. Takes sourceId and botId,
 * enforces access (same rules as Bots/Sources findOne), then updates the relation.
 * Bot owns the relation so we load the bot (with kbSources) and save it.
 * No dependency on BotModule or KnowledgeBaseModule — no circular deps.
 */
@Injectable()
export class BotKbLinkService {
  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    @InjectRepository(KBSource)
    private readonly kbSourceRepository: Repository<KBSource>,
  ) {}

  /**
   * Find a bot by id with access check (SUPER_ADMIN or same org). Optionally load kbSources for link/unlink.
   */
  private async findBot(
    ctx: RequestContext,
    botId: string,
    options?: { withKbSources?: boolean },
  ): Promise<Bot> {
    const bot = await this.botRepository.findOne({
      where: { id: botId },
      relations: options?.withKbSources ? ['kbSources'] : undefined,
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
    return bot;
  }

  /**
   * Find a KB source by id with access check.
   */
  private async findSource(
    ctx: RequestContext,
    sourceId: string,
  ): Promise<KBSource> {
    const source = await this.kbSourceRepository.findOne({
      where: { id: sourceId },
    });
    if (!source) {
      throw new NotFoundException(
        `Knowledge base source with ID ${sourceId} not found`,
      );
    }
    if (
      ctx.user?.roleName !== RoleName.SUPER_ADMIN &&
      source.organizationId !== ctx.user?.organizationId
    ) {
      throw new NotFoundException(
        `Knowledge base source with ID ${sourceId} not found`,
      );
    }
    return source;
  }

  /**
   * Link a bot to a KB source. Loads both via findBot/findSource, checks same org, then saves on the bot.
   */
  async linkByIds(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    const source = await this.findSource(ctx, sourceId);
    if (source.status !== SourceStatus.READY) {
      throw new BadRequestException(
        `Source is ${source.status.toLowerCase()} and cannot be linked`,
      );
    }
    const bot = await this.findBot(ctx, botId, { withKbSources: true });
    if (source.organizationId !== bot.organizationId) {
      throw new BadRequestException(
        'Bot and source must belong to the same organization',
      );
    }
    const kbSources = bot.kbSources ?? [];
    if (kbSources.some((s) => s.id === source.id)) {
      return source;
    }
    bot.kbSources = [...kbSources, source];
    await this.botRepository.save(bot);
    return source;
  }

  /**
   * Unlink a bot from a KB source. Loads both via findBot/findSource, then saves on the bot.
   */
  async unlinkByIds(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    const source = await this.findSource(ctx, sourceId);
    const bot = await this.findBot(ctx, botId, { withKbSources: true });
    bot.kbSources = (bot.kbSources ?? []).filter((s) => s.id !== sourceId);
    await this.botRepository.save(bot);
    return source;
  }
}
