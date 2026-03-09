import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { BotKbLinkModule } from '../bot-kb-link/bot-kb-link.module';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bot]), BotKbLinkModule],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
