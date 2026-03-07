import {
  Entity,
  Column,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  BotType,
  BotState,
  VisibilityDuration,
  Behavior,
  BotPriority,
} from '../../types/bot';
import { Organization } from './organization.entity';
import { KBSource } from './kb-source.entity';

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

  @Column({
    type: 'varchar',
    name: 'visibility_duration',
    nullable: true,
  })
  visibilityDuration: VisibilityDuration | null;

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
  kbSources: KBSource[];
}
