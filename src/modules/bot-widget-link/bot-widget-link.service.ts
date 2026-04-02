import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { Widget } from '../../common/entities/widget.entity';
import { WidgetAppearance } from '../../common/enums/widget.enum';
import { DEFAULT_WIDGET_CONFIG } from '../../common/constants/widget-config';

@Injectable()
export class BotWidgetLinkService {
  constructor(
    @InjectRepository(Widget)
    private readonly widgetRepository: Repository<Widget>,
  ) {}

  async createDefaultWidgetForBot(botId: string): Promise<Widget[]> {
    const lightWidget = this.widgetRepository.create({
      botId,
      ...DEFAULT_WIDGET_CONFIG,
      mode: WidgetAppearance.LIGHT,
    });
    const darkWidget = this.widgetRepository.create({
      botId,
      ...DEFAULT_WIDGET_CONFIG,
      mode: WidgetAppearance.DARK,
    });
    const savedLight = await this.widgetRepository.save(lightWidget);
    const savedDark = await this.widgetRepository.save(darkWidget);
    return [savedLight, savedDark];
  }

  async removeWidgetsForBot(bot: Bot & { widgets?: Widget[] }): Promise<void> {
    const widgets =
      bot.widgets ??
      (await this.widgetRepository.find({ where: { botId: bot.id } }));
    if (widgets.length > 0) await this.widgetRepository.remove(widgets);
  }
}
