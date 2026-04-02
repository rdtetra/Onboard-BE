import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Subscription } from './subscription.entity';
import { PlanKey } from '../enums/plan-key.enum';

@Entity('plans')
export class Plan extends BaseEntity {
  @Column({ type: 'enum', enum: PlanKey, unique: true, nullable: true })
  key: PlanKey | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', name: 'monthly_price_cents' })
  monthlyPriceCents: number;

  @Column({ type: 'int', name: 'monthly_tokens' })
  monthlyTokens: number;

  @Column({ type: 'int', name: 'storage_limit_mb' })
  storageLimitMb: number;

  @Column({ type: 'int', name: 'max_bots' })
  maxBots: number;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, unknown> | null;

  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions: Subscription[];
}
