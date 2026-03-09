import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from '../../common/entities/task.entity';
import { Chip } from '../../common/entities/chip.entity';

/**
 * Single place for bot ↔ task link behavior (e.g. when a bot is removed, soft-delete its tasks).
 * Depends only on Task and Chip entities; BotsModule imports this, no dependency on TasksModule — no circular deps.
 */
@Injectable()
export class BotTaskLinkService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Chip)
    private readonly chipRepository: Repository<Chip>,
  ) {}

  /**
   * Soft-delete all tasks (and their chips) for a bot. Caller is responsible for access checks.
   * Used by BotsService when a bot is removed.
   */
  async softRemoveTasksForBot(botId: string): Promise<void> {
    const tasks = await this.taskRepository.find({ where: { botId } });
    if (tasks.length === 0) return;
    const taskIds = tasks.map((t) => t.id);
    const chips = await this.chipRepository.find({
      where: { taskId: In(taskIds) },
    });
    if (chips.length > 0) {
      await this.chipRepository.softRemove(chips);
    }
    await this.taskRepository.softRemove(tasks);
  }
}
