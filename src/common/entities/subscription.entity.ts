import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Plan } from './plan.entity';
import { Organization } from './organization.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Entity('subscriptions')
@Unique(['organizationId'])
export class Subscription extends BaseEntity {
  @Column({ type: 'uuid', name: 'org_id' })
  organizationId: string;

  @OneToOne(() => Organization, (org) => org.subscription, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Plan, (plan) => plan.subscriptions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ type: 'enum', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp', name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp', name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', name: 'next_renewal_at', nullable: true })
  nextRenewalAt: Date | null;

  @Column({
    type: 'varchar',
    name: 'provider_subscription_id',
    nullable: true,
    length: 255,
  })
  providerSubscriptionId: string | null;
}
