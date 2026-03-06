import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Bot } from './bot.entity';
import { KBSource } from './kb-source.entity';
import { Collection } from './collection.entity';

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
}
