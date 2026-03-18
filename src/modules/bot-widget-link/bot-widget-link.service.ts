import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { Widget } from '../../common/entities/widget.entity';
import { WidgetPosition, WidgetAppearance } from '../../types/widget';

/**
 * Single place for bot ↔ widget link behavior. Each bot has two widgets (LIGHT and DARK mode).
 */
@Injectable()
export class BotWidgetLinkService {
  constructor(
    @InjectRepository(Widget)
    private readonly widgetRepository: Repository<Widget>,
  ) {}

  /**
   * Create default LIGHT and DARK widgets for a bot and link them. Caller is responsible for access checks.
   * Used by BotsService when a bot is created.
   */
  async createDefaultWidgetForBot(botId: string): Promise<Widget[]> {
    const defaults = {
      botLogoUrl: null as string | null,
      position: WidgetPosition.BOTTOM_RIGHT,
      primaryColor: '#7b61ff',
      headerTextColor: '#fefefe',
      background: '#fefefe',
      botMessageBg: '#f2efff',
      botMessageText: '#7b61ff',
      userMessageBg: '#7b61ff',
      userMessageText: '#fefefe',
      headerText: 'Hi, how can I help?',
      welcomeMessage:
        'Welcome to Onboard Support! Ask me anything about our products.',
      showPoweredBy: false,
    };
    const lightWidget = this.widgetRepository.create({
      botId,
      mode: WidgetAppearance.LIGHT,
      ...defaults,
    });
    const darkWidget = this.widgetRepository.create({
      botId,
      mode: WidgetAppearance.DARK,
      ...defaults,
    });
    const savedLight = await this.widgetRepository.save(lightWidget);
    const savedDark = await this.widgetRepository.save(darkWidget);
    return [savedLight, savedDark];
  }

  /**
   * Soft-delete all widgets for the given bot. Caller must pass bot with widgets relation loaded.
   * Used by BotsService when a bot is removed.
   */
  async removeWidgetsForBot(bot: Bot & { widgets?: Widget[] }): Promise<void> {
    const widgets =
      bot.widgets ??
      (await this.widgetRepository.find({ where: { botId: bot.id } }));
    for (const widget of widgets) {
      await this.widgetRepository.softRemove(widget);
    }
  }

  /**
   * Unlink a widget from its bot (set botId = null). Used when soft-deleting a single widget.
   */
  async unlinkWidget(widget: Widget): Promise<void> {
    if (widget.botId) {
      widget.botId = null;
      widget.bot = null;
      await this.widgetRepository.save(widget);
    }
  }
}
