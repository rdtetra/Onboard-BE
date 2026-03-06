import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import { hashPassword, generateTempPassword } from '../../utils/crypto.util';
import { User } from '../../common/entities/user.entity';
import { Role } from '../../common/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { parsePagination, toPaginatedResult } from '../../utils/pagination.util';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(ctx: RequestContext, createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(ctx, createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const isFirstUser = (await this.userRepository.count()) === 0;
    const roleName = isFirstUser ? RoleName.SUPER_ADMIN : RoleName.TENANT;

    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new InternalServerErrorException(
        `${roleName} role not found. Please ensure roles are seeded.`,
      );
    }

    const hashedPassword = await hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role,
      ...(isFirstUser && { emailVerifiedAt: new Date() }),
    });

    const saved = await this.userRepository.save(user);
    if (!isFirstUser) {
      await this.organizationsService.createForUser(
        saved.id,
        `${saved.fullName || saved.email}'s Organization`,
      );
    }
    const updated = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: ['role', 'organization'],
    });
    return updated ?? saved;
  }

  async inviteUser(ctx: RequestContext, inviteUserDto: InviteUserDto): Promise<User> {
    if (!ctx.user?.organizationId) {
      throw new BadRequestException('You must belong to an organization to invite users');
    }
    const existingUser = await this.findByEmail(ctx, inviteUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const tenantRole = await this.roleRepository.findOne({
      where: { name: RoleName.TENANT },
    });
    if (!tenantRole) {
      throw new InternalServerErrorException(
        'TENANT role not found. Please ensure roles are seeded.',
      );
    }

    const tempPassword = generateTempPassword();
    // TODO: send email to inviteUserDto.email with temp password and login link
    console.log(`[Invite] Temp password for ${inviteUserDto.email}: ${tempPassword}`);

    const hashedPassword = await hashPassword(tempPassword);
    const user = this.userRepository.create({
      email: inviteUserDto.email,
      fullName: inviteUserDto.fullName,
      password: hashedPassword,
      role: tenantRole,
      organizationId: ctx.user.organizationId,
      passwordChangeRequired: true,
    });
    return this.userRepository.save(user);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { search?: string; status?: string; organizationId?: string },
    relations?: FindOptionsRelations<User>,
  ): Promise<PaginatedResult<User>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    /**
     * We use TypeORM QueryBuilder for user list (findAll) instead of repository.find() + separate
     * finds for relation counts so the DB does the counting in one round-trip with minimal data
     * transfer (user columns + two count columns), rather than loading all bot/kb_source rows and
     * counting in the application.
     */
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.organizationId',
        'user.createdAt',
        'user.updatedAt',
        'user.emailVerifiedAt',
        'user.passwordChangeRequired',
        'user.isActive',
      ])
      .leftJoin('user.organization', 'org')
      .loadRelationCountAndMap('user.botCount', 'user.organization.bots')
      .loadRelationCountAndMap('user.kbSourceCount', 'user.organization.kbSources')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere('(user.email ILIKE :search OR user.fullName ILIKE :search)', { search: term });
    }
    if (filters?.status === 'active') {
      qb.andWhere('user.isActive = :isActive', { isActive: true });
    } else if (filters?.status === 'inactive') {
      qb.andWhere('user.isActive = :isActive', { isActive: false });
    }
    if (ctx.user?.organizationId) {
      qb.andWhere('user.organizationId = :organizationId', { organizationId: ctx.user.organizationId });
    } else if (filters?.organizationId) {
      qb.andWhere('user.organizationId = :organizationId', { organizationId: filters.organizationId });
    }
    if (relations && Array.isArray(relations) && relations.length > 0) {
      const rels = relations as string[];
      if (rels.includes('role')) qb.leftJoinAndSelect('user.role', 'role');
      if (rels.includes('organization')) qb.leftJoinAndSelect('user.organization', 'organization');
    }
    const [data, total] = await qb.getManyAndCount();
    return toPaginatedResult(data, total, page, limit);
  }

  /** Load user entity only (for update/remove). */
  private async getOne(id: string, relations?: FindOptionsRelations<User>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: (relations as string[]) ?? ['role'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    relations?: FindOptionsRelations<User>,
  ): Promise<User> {
    const defaultRelations: FindOptionsRelations<User> = { role: { permissions: true }, organization: true };
    const user = await this.userRepository.findOne({
      where: { id },
      relations: relations ?? defaultRelations,
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmail(
    ctx: RequestContext,
    email: string,
    relations?: FindOptionsRelations<User>,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations,
    });
  }

  async update(ctx: RequestContext, id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await hashPassword(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    if (updateUserDto.password) {
      user.passwordChangeRequired = false;
    }
    return this.userRepository.save(user);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const user = await this.getOne(id);
    await this.userRepository.remove(user);
  }
}
