import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bot } from '../../common/entities/bot.entity';
import { Task } from '../../common/entities/task.entity';
import { Chip } from '../../common/entities/chip.entity';
import { BotKbLinkModule } from '../bot-kb-link/bot-kb-link.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bot, Task, Chip]),
    BotKbLinkModule,
    KnowledgeBaseModule,
  ],
  controllers: [BotsController, TasksController],
  providers: [BotsService, TasksService],
  exports: [BotsService],
})
export class BotsModule {}
