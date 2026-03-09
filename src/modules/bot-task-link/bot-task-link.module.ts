import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../common/entities/task.entity';
import { Chip } from '../../common/entities/chip.entity';
import { BotTaskLinkService } from './bot-task-link.service';

/**
 * Single place for bot ↔ task link behavior (e.g. soft-delete tasks when a bot is removed).
 * Depends only on entities; Bots module imports this, never Tasks module — no circular deps.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Task, Chip])],
  providers: [BotTaskLinkService],
  exports: [BotTaskLinkService],
})
export class BotTaskLinkModule {}
