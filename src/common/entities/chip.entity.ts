import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChipType } from '../enums/task.enum';
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

  /** URL for link-type chips. Null for query-type. */
  @Column({ type: 'varchar', length: 2048, nullable: true })
  url: string | null;

  /** Open link in new tab (link-type chips). Default false. */
  @Column({ type: 'boolean', name: 'new_tab', default: false })
  newTab: boolean;

}
