import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Widget } from '../../common/entities/widget.entity';
import { BotWidgetLinkService } from './bot-widget-link.service';

/**
 * Single place for bot ↔ widget link behavior (e.g. remove widget when a bot is removed).
 * Depends only on entities; BotModule imports this, never WidgetModule — no circular deps.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Widget])],
  providers: [BotWidgetLinkService],
  exports: [BotWidgetLinkService],
})
export class BotWidgetLinkModule {}
