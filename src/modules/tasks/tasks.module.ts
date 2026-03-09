import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../common/entities/task.entity';
import { Chip } from '../../common/entities/chip.entity';
import { BotsModule } from '../bots/bots.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Chip]),
    BotsModule,
    KnowledgeBaseModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
