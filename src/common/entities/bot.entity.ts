import { Entity, Column, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BotType, BotState, VisibilityDuration } from '../../types/bot';

@Entity('bots')
export class Bot extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ type: 'enum', enum: BotType, name: 'bot_type' })
  botType: BotType;

  @Column({ type: 'enum', enum: BotState, default: BotState.ACTIVE })
  state: BotState;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
}
