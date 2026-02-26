import { Entity, Column, DeleteDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SourceType, SourceStatus, RefreshSchedule } from '../../types/knowledge-base';
import { Bot } from './bot.entity';
import { Collection } from './collection.entity';

@Entity('kb_sources')
export class KBSource extends BaseEntity {
  @Column({ type: 'uuid', name: 'collection_id', nullable: true })
  collectionId: string | null;

  @ManyToOne(() => Collection, (c) => c.sources, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection | null;

  @ManyToMany(() => Bot, (bot) => bot.kbSources)
  @JoinTable({
    name: 'kb_source_bots',
    joinColumn: { name: 'kb_source_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'bot_id', referencedColumnName: 'id' },
  })
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

  @Column({ type: 'timestamp', name: 'next_refresh_scheduled_at', nullable: true })
  nextRefreshScheduledAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
