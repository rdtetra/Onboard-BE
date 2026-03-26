import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from '../../common/entities/task.entity';
import { Chip } from '../../common/entities/chip.entity';

@Injectable()
export class BotTaskLinkService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Chip)
    private readonly chipRepository: Repository<Chip>,
  ) {}

  async removeTasksForBot(botId: string): Promise<void> {
    const tasks = await this.taskRepository.find({ where: { botId } });
    if (tasks.length === 0) return;
    const taskIds = tasks.map((t) => t.id);
    const chips = await this.chipRepository.find({
      where: { taskId: In(taskIds) },
    });
    if (chips.length > 0) {
      await this.chipRepository.remove(chips);
    }
    await this.taskRepository.remove(tasks);
  }
}
