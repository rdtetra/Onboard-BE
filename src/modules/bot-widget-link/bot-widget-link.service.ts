import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { Widget } from '../../common/entities/widget.entity';

/**
 * Single place for bot ↔ widget link behavior (e.g. when a bot is removed, delete its widget).
 * Depends only on entities; BotsModule imports this, no dependency on WidgetsModule — no circular deps.
 */
@Injectable()
export class BotWidgetLinkService {
  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    @InjectRepository(Widget)
    private readonly widgetRepository: Repository<Widget>,
  ) {}

  /**
   * Set the widget for a bot (link). Caller is responsible for access checks.
   */
  async setBotWidget(botId: string, widget: Widget): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });
    if (bot) {
      bot.widget = widget;
      await this.botRepository.save(bot);
    }
  }

  /**
   * Soft-delete the widget linked to the given bot. Caller must pass bot with widget relation loaded.
   * Unlinks the widget from the bot, then soft-deletes the widget.
   * Caller is responsible for access checks. Used by BotsService when a bot is removed.
   */
  async removeWidgetForBot(bot: Bot & { widget?: Widget | null }): Promise<void> {
    if (bot.widget) {
      const widget = bot.widget;
      bot.widget = null;
      await this.botRepository.save(bot);
      await this.widgetRepository.softRemove(widget);
    }
  }

  /**
   * Unlink the widget from a bot (set bot.widget = null). Caller is responsible for access checks.
   * Used by WidgetsService when soft-deleting a widget.
   */
  async unlinkWidgetFromBot(botId: string): Promise<void> {
    const bot = await this.botRepository.findOne({
      where: { id: botId },
      relations: ['widget'],
    });
    if (bot?.widget) {
      bot.widget = null;
      await this.botRepository.save(bot);
    }
  }
}
