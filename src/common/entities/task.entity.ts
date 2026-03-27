import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bot } from './bot.entity';
import { Chip } from './chip.entity';

@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column('text', { array: true, name: 'target_urls', default: [] })
  targetUrls: string[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'bot_id' })
  botId: string;

  @ManyToOne(() => Bot, (bot) => bot.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bot_id' })
  bot: Bot;

  @OneToMany(() => Chip, (chip) => chip.task, { cascade: true })
  chips: Chip[];

}
