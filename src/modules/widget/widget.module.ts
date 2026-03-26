import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Widget } from '../../common/entities/widget.entity';
import { BotModule } from '../bot/bot.module';
import { BotWidgetLinkModule } from '../bot-widget-link/bot-widget-link.module';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Widget]),
    BotModule,
    BotWidgetLinkModule,
  ],
  controllers: [WidgetController],
  providers: [WidgetService],
  exports: [WidgetService],
})
export class WidgetModule {}
