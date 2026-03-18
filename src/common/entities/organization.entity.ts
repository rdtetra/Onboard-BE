import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Bot } from './bot.entity';
import { KBSource } from './kb-source.entity';
import { Collection } from './collection.entity';
import { Subscription } from './subscription.entity';
import { TokenWallet } from './token-wallet.entity';
import { PaymentMethod } from './payment-method.entity';
import { Invoice } from './invoice.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => User, (u) => u.organization)
  users: User[];

  @OneToMany(() => Bot, (bot) => bot.organization)
  bots: Bot[];

  @OneToMany(() => KBSource, (kb) => kb.organization)
  kbSources: KBSource[];

  @OneToMany(() => Collection, (c) => c.organization)
  collections: Collection[];

  @OneToOne(() => Subscription, (s) => s.organization)
  subscription: Subscription | null;

  @OneToOne(() => TokenWallet, (w) => w.organization)
  tokenWallet: TokenWallet | null;

  @OneToMany(() => PaymentMethod, (pm) => pm.organization)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Invoice, (i) => i.organization)
  invoices: Invoice[];
}
