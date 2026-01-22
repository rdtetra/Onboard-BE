import { Entity, Column, ManyToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';
import { Permission as PermissionEnum } from '../../types/permissions';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ unique: true, type: 'varchar' })
  name: PermissionEnum;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
