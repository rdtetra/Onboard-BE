import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true, name: 'full_name' })
  fullName: string;

  @Column({ nullable: true, name: 'email_verified_at', type: 'timestamp' })
  emailVerifiedAt: Date | null;

  @Column({ default: false, name: 'password_change_required' })
  passwordChangeRequired: boolean;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
