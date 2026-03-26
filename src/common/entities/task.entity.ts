import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bot } from './bot.entity';
import { KBSource } from './kb-source.entity';
import { Chip } from './chip.entity';

@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', name: 'intro_message', nullable: true })
  introMessage: string | null;

  @Column({ type: 'text', nullable: true })
  instruction: string | null;

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

  @ManyToMany(() => KBSource, (source) => source.tasks)
  @JoinTable({
    name: 'task_kb_sources',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'kb_source_id', referencedColumnName: 'id' },
  })
  kbSources: KBSource[];

}
