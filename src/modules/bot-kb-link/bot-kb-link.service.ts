import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { KBSource } from '../../common/entities/kb-source.entity';

/**
 * Handles only the persistence of bot ↔ KB source links. No permission checks
 * or lookups — callers (e.g. SourcesService) must use their findOne / permission
 * flow first and pass already-validated entities so the source of truth stays
 * in one place.
 */
@Injectable()
export class BotKbLinkService {
  constructor(
    @InjectRepository(KBSource)
    private readonly kbSourceRepository: Repository<KBSource>,
  ) {}

  /**
   * Add bot to source's bots. Caller must have already validated access to both
   * and that they belong to the same organization.
   */
  async link(source: KBSource, bot: Bot): Promise<KBSource> {
    const bots = source.bots ?? [];
    if (bots.some((b) => b.id === bot.id)) {
      return source;
    }
    source.bots = [...bots, bot];
    return this.kbSourceRepository.save(source);
  }

  /**
   * Remove bot from source's bots by id. Caller must have already validated
   * access to the source (and optionally to the bot for consistent 404s).
   */
  async unlink(source: KBSource, botId: string): Promise<KBSource> {
    source.bots = (source.bots ?? []).filter((b) => b.id !== botId);
    return this.kbSourceRepository.save(source);
  }
}
