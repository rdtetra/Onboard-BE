import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { Widget } from '../../common/entities/widget.entity';
import { BotWidgetLinkService } from './bot-widget-link.service';

/**
 * Single place for bot ↔ widget link behavior (e.g. remove widget when a bot is removed).
 * Depends only on entities; BotsModule imports this, never WidgetsModule — no circular deps.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bot, Widget])],
  providers: [BotWidgetLinkService],
  exports: [BotWidgetLinkService],
})
export class BotWidgetLinkModule {}
