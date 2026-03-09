import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Widget } from '../../common/entities/widget.entity';
import { BotsModule } from '../bots/bots.module';
import { BotWidgetLinkModule } from '../bot-widget-link/bot-widget-link.module';
import { WidgetsService } from './widgets.service';
import { WidgetsController } from './widgets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Widget]),
    BotsModule,
    BotWidgetLinkModule,
  ],
  controllers: [WidgetsController],
  providers: [WidgetsService],
  exports: [WidgetsService],
})
export class WidgetsModule {}
