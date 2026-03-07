import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotKbLinkService } from './bot-kb-link.service';

/**
 * Module for bot ↔ KB source relation (link/unlink). Only persists the
 * relation; callers do permission checks via their own findOne and pass
 * validated entities.
 */
@Module({
  imports: [TypeOrmModule.forFeature([KBSource])],
  providers: [BotKbLinkService],
  exports: [BotKbLinkService],
})
export class BotKbLinkModule {}
