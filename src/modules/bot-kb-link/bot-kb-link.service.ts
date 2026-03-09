import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';

/**
 * Single source of truth for bot ↔ KB source link/unlink. Takes sourceId and botId,
 * enforces access (same rules as Bots/Sources findOne), then updates the relation.
 * KBSource owns the relation so we load the source and save it.
 * No dependency on BotsModule or KnowledgeBaseModule — no circular deps.
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
   * Find a bot by id with access check (SUPER_ADMIN or same org). Throws if not found or no access.
   */
  private async findBot(ctx: RequestContext, botId: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });
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
   * Find a KB source by id with access check. Optionally load bots relation for link/unlink.
   */
  private async findSource(
    ctx: RequestContext,
    sourceId: string,
    options?: { withBots?: boolean },
  ): Promise<KBSource> {
    const source = await this.kbSourceRepository.findOne({
      where: { id: sourceId },
      relations: options?.withBots ? ['bots'] : undefined,
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
   * Link a bot to a KB source. Loads both via findBot/findSource, checks same org, then saves on the source.
   */
  async linkByIds(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    const source = await this.findSource(ctx, sourceId, { withBots: true });
    const bot = await this.findBot(ctx, botId);
    if (source.organizationId !== bot.organizationId) {
      throw new BadRequestException(
        'Bot and source must belong to the same organization',
      );
    }
    const bots = source.bots ?? [];
    if (bots.some((b) => b.id === bot.id)) {
      return source;
    }
    source.bots = [...bots, bot];
    return this.kbSourceRepository.save(source);
  }

  /**
   * Unlink a bot from a KB source. Loads both via findBot/findSource, then saves on the source.
   */
  async unlinkByIds(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    const source = await this.findSource(ctx, sourceId, { withBots: true });
    await this.findBot(ctx, botId);
    source.bots = (source.bots ?? []).filter((b) => b.id !== botId);
    return this.kbSourceRepository.save(source);
  }
}
