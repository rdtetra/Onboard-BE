import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentMethodType } from '../enums/payment-method-type.enum';

@Entity('payment_methods')
export class PaymentMethod extends BaseEntity {
  @Column({ type: 'uuid', name: 'org_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({
    type: 'varchar',
    name: 'provider_payment_method_id',
    nullable: true,
    length: 255,
  })
  providerPaymentMethodId: string | null;

  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType;

  @Column({ type: 'varchar', length: 4, nullable: true })
  last4: string | null;

  @Column({
    type: 'varchar',
    name: 'name_on_card',
    length: 200,
    nullable: true,
  })
  nameOnCard: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brand: string | null;

  @Column({ type: 'int', name: 'exp_month', nullable: true })
  expMonth: number | null;

  @Column({ type: 'int', name: 'exp_year', nullable: true })
  expYear: number | null;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;
}
