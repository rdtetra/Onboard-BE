import { Entity, Column, OneToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { TokenTransaction } from './token-transaction.entity';

@Entity('token_wallets')
@Unique(['organizationId'])
export class TokenWallet extends BaseEntity {
  @Column({ type: 'uuid', name: 'org_id' })
  organizationId: string;

  @OneToOne(() => Organization, (org) => org.tokenWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @OneToMany(() => TokenTransaction, (tx) => tx.wallet)
  transactions: TokenTransaction[];
}
