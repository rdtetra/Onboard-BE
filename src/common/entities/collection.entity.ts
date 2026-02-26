import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { KBSource } from './kb-source.entity';

@Entity('collections')
export class Collection extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => KBSource, (source) => source.collection)
  sources: KBSource[];
}
