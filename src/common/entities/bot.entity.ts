import {
  Entity,
  Column,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  BotType,
  BotState,
  Behavior,
  BotPriority,
} from '../../types/bot';
import { Organization } from './organization.entity';
import { KBSource } from './kb-source.entity';
import { Task } from './task.entity';
import { Widget } from './widget.entity';
import { Conversation } from './conversation.entity';

@Entity('bots')
export class Bot extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ type: 'enum', enum: BotType, name: 'bot_type' })
  botType: BotType;

  @Column({ type: 'enum', enum: BotState, default: BotState.ACTIVE })
  state: BotState;

  @Column({
    type: 'enum',
    enum: Behavior,
    name: 'display_mode',
    nullable: true,
  })
  behavior: Behavior | null;

  @Column({
    type: 'enum',
    enum: BotPriority,
    nullable: true,
  })
  priority: BotPriority | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', name: 'intro_message', nullable: true })
  introMessage: string | null;

  @Column('text', { array: true, default: [] })
  domains: string[];

  @Column('text', { array: true, name: 'target_urls', default: [] })
  targetUrls: string[];

  @Column({ default: false, name: 'once_per_session' })
  oncePerSession: boolean;

  @Column({
    type: 'timestamp',
    name: 'visibility_start_date',
    nullable: true,
  })
  visibilityStartDate: Date | null;

  @Column({
    type: 'timestamp',
    name: 'visibility_end_date',
    nullable: true,
  })
  visibilityEndDate: Date | null;

  @ManyToMany(() => KBSource, (source) => source.bots)
  @JoinTable({
    name: 'kb_source_bots',
    joinColumn: { name: 'bot_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'kb_source_id', referencedColumnName: 'id' },
  })
  kbSources: KBSource[];

  @OneToMany(() => Task, (task) => task.bot)
  tasks: Task[];

  @OneToMany(() => Conversation, (conversation) => conversation.bot)
  conversations: Conversation[];

  @OneToOne(() => Widget, (widget) => widget.bot, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'widget_id' })
  widget: Widget | null;
}
