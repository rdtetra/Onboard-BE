import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotKbLinkService } from './bot-kb-link.service';

/**
 * Single place for bot ↔ KB source link/unlink. Depends only on entities;
 * Bots and KnowledgeBase modules only import this, never each other.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bot, KBSource])],
  providers: [BotKbLinkService],
  exports: [BotKbLinkService],
})
export class BotKbLinkModule {}
