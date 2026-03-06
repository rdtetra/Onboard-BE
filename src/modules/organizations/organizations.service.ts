import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../common/entities/organization.entity';
import { User } from '../../common/entities/user.entity';
import { Role } from '../../common/entities/role.entity';
import { RoleName } from '../../types/roles';

/**
 * Organization is internal: not exposed to clients. A tenant (user) gets an org
 * automatically on signup and becomes its owner. All their resources live in that org.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Create an organization for a user and set them as owner. Used when a new tenant signs up or when super admin invites.
   */
  async createForUser(
    userId: string,
    name: string = 'My Organization',
  ): Promise<Organization> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.organizationId) {
      return this.organizationRepository.findOne({
        where: { id: user.organizationId },
        relations: ['owner'],
      }) as Promise<Organization>;
    }
    const tenantRole = await this.roleRepository.findOne({
      where: { name: RoleName.TENANT },
    });

    if (!tenantRole) {
      throw new NotFoundException('TENANT role not found. Run seed.');
    }

    const org = this.organizationRepository.create({
      name: name.trim(),
      ownerId: userId,
    });
    const saved = await this.organizationRepository.save(org);
    user.organizationId = saved.id;
    user.role = tenantRole;
    await this.userRepository.save(user);
    return this.organizationRepository.findOne({
      where: { id: saved.id },
      relations: ['owner'],
    }) as Promise<Organization>;
  }
}
