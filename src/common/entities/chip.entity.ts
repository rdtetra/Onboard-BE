import {
  Entity,
  Column,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChipType } from '../../types/task';
import type { Task } from './task.entity';

@Entity('chips')
export class Chip extends BaseEntity {
  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @ManyToOne('Task', 'chips', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'enum', enum: ChipType })
  type: ChipType;

  @Column({ type: 'varchar', name: 'chip_name' })
  chipName: string;

  @Column({ type: 'text', name: 'chip_text' })
  chipText: string;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
