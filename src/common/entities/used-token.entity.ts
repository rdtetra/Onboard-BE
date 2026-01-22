import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('used_tokens')
export class UsedToken extends BaseEntity {
  @Column({ name: 'token', unique: true })
  token: string;
}
