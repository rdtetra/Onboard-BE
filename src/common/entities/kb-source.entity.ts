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
  SourceType,
  SourceStatus,
  RefreshSchedule,
} from '../../types/knowledge-base';
import { Organization } from './organization.entity';
import { Bot } from './bot.entity';
import { Collection } from './collection.entity';
import { Task } from './task.entity';

@Entity('kb_sources')
export class KBSource extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ type: 'uuid', name: 'collection_id', nullable: true })
  collectionId: string | null;

  @ManyToOne(() => Collection, (c) => c.sources, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection | null;

  /** Inverse side of Bot.kbSources – Bot owns the many-to-many. */
  @ManyToMany(() => Bot, (bot) => bot.kbSources)
  bots: Bot[];

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: SourceType, name: 'source_type' })
  sourceType: SourceType;

  @Column({ type: 'text', name: 'source_value' })
  sourceValue: string;

  @Column({ type: 'int', name: 'file_size_bytes', nullable: true })
  fileSizeBytes: number | null;

  @Column({ type: 'enum', enum: SourceStatus, default: SourceStatus.READY })
  status: SourceStatus;

  @Column({
    type: 'enum',
    enum: RefreshSchedule,
    name: 'refresh_schedule',
    nullable: true,
  })
  refreshSchedule: RefreshSchedule | null;

  @Column({ type: 'int', name: 'linked_bots', default: 0 })
  linkedBots: number;

  @Column({ type: 'timestamp', name: 'last_refreshed', nullable: true })
  lastRefreshed: Date | null;

  @Column({
    type: 'timestamp',
    name: 'next_refresh_scheduled_at',
    nullable: true,
  })
  nextRefreshScheduledAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @ManyToMany(() => Task, (task) => task.kbSources)
  tasks: Task[];
}
