import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Subscription } from './subscription.entity';
import { InvoiceStatus } from '../enums/invoice-status.enum';

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ type: 'uuid', name: 'org_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @Column({ type: 'uuid', name: 'subscription_id', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;

  @Column({ type: 'enum', enum: InvoiceStatus })
  status: InvoiceStatus;

  @Column({ type: 'int', name: 'amount_due' })
  amountDue: number;

  @Column({ type: 'int', name: 'amount_paid', default: 0 })
  amountPaid: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency: string;

  @Column({
    type: 'varchar',
    name: 'provider_invoice_id',
    nullable: true,
    length: 255,
  })
  providerInvoiceId: string | null;

  @Column({
    type: 'varchar',
    name: 'invoice_pdf_url',
    nullable: true,
    length: 2048,
  })
  invoicePdfUrl: string | null;

  @Column({ type: 'timestamp', name: 'period_start', nullable: true })
  periodStart: Date | null;

  @Column({ type: 'timestamp', name: 'period_end', nullable: true })
  periodEnd: Date | null;

  @Column({ type: 'timestamp', name: 'due_date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'timestamp', name: 'paid_at', nullable: true })
  paidAt: Date | null;
}
