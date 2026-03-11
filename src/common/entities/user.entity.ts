import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';
import { Organization } from './organization.entity';
import { UserStatus } from '../../types/user-status';

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

  @Column({
    type: 'varchar',
    default: UserStatus.ACTIVE,
    length: 20,
  })
  status: UserStatus;

  @Column({ nullable: true, name: 'joined_at', type: 'timestamp' })
  joinedAt: Date | null;

  @Column({
    nullable: true,
    name: 'last_password_reset_email_at',
    type: 'timestamp',
  })
  lastPasswordResetEmailAt: Date | null;

  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, (org) => org.users, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /** Set when loading user list with relation counts (e.g. findAll). */
  botCount?: number;
  /** Set when loading user list with relation counts (e.g. findAll). */
  kbSourceCount?: number;
}
