import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations, FindOptionsWhere, ILike } from 'typeorm';
import { hashPassword, generateTempPassword } from '../../utils/crypto.util';
import { User } from '../../common/entities/user.entity';
import { Role } from '../../common/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleName } from '../../types/roles';
import { UserStatus } from '../../types/user-status';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';
import { getUserListScope } from '../../utils/scope.util';
import { OrganizationsService } from '../organizations/organizations.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly organizationsService: OrganizationsService,
    private readonly emailService: EmailService,
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    ctx: RequestContext,
    createUserDto: CreateUserDto,
  ): Promise<User> {
    const existingUser = await this.findByEmail(ctx, createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const userCount = await this.userRepository.count();
    const isFirstUser = userCount === 0;
    const roleName =
      createUserDto.role ??
      (isFirstUser ? RoleName.SUPER_ADMIN : RoleName.TENANT);

    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new InternalServerErrorException(
        `Role ${roleName} not found. Please ensure roles are seeded.`,
      );
    }

    const hashedPassword = await hashPassword(createUserDto.password);

    const { role: _role, ...createPayload } = createUserDto;
    const user = this.userRepository.create({
      ...createPayload,
      password: hashedPassword,
      role,
      ...(isFirstUser && { emailVerifiedAt: new Date() }),
    });

    const saved = await this.userRepository.save(user);

    if (!isFirstUser && roleName === RoleName.TENANT) {
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

  /**
   * Single invite entry point: delegates to super-admin or org-owner flow based on caller role.
   */
  async inviteUser(
    ctx: RequestContext,
    inviteUserDto: InviteUserDto,
  ): Promise<User> {
    if (ctx.user?.roleName === RoleName.SUPER_ADMIN) {
      return this.inviteBySuperAdmin(ctx, inviteUserDto);
    }
    return this.inviteByOrgAdmin(ctx, inviteUserDto);
  }

  /**
   * Super admin invites a new user: they get a new organization (random name) and are set as owner (TENANT).
   * Email is sent first; the user is created only if the email is sent successfully.
   */
  async inviteBySuperAdmin(
    ctx: RequestContext,
    inviteUserDto: InviteUserDto,
  ): Promise<User> {
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
    const hashedPassword = await hashPassword(tempPassword);

    await this.sendInviteEmail(inviteUserDto, tempPassword);

    const user = this.userRepository.create({
      email: inviteUserDto.email,
      fullName: inviteUserDto.fullName,
      password: hashedPassword,
      role: tenantRole,
      organizationId: null,
      passwordChangeRequired: true,
      emailVerifiedAt: new Date(),
      status: UserStatus.PENDING,
    });
    const saved = await this.userRepository.save(user);

    const randomOrgName = `Organization ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await this.organizationsService.createForUser(saved.id, randomOrgName);

    const updated = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: ['role', 'organization'],
    });
    return updated ?? saved;
  }

  /**
   * Org owner/admin invites a new user: they join the inviter's organization.
   * Role can be TENANT or MEMBER (optional; default TENANT). Email is sent first; user is created only if email sends.
   */
  async inviteByOrgAdmin(
    ctx: RequestContext,
    inviteUserDto: InviteUserDto,
  ): Promise<User> {
    if (!ctx.user?.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to invite users',
      );
    }

    const roleName = inviteUserDto.role ?? RoleName.TENANT;
    if (roleName === RoleName.SUPER_ADMIN) {
      throw new BadRequestException(
        'You cannot invite users as super admin',
      );
    }

    const existingUser = await this.findByEmail(ctx, inviteUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });
    if (!role) {
      throw new InternalServerErrorException(
        `Role ${roleName} not found. Please ensure roles are seeded.`,
      );
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    await this.sendInviteEmail(inviteUserDto, tempPassword);

    const user = this.userRepository.create({
      email: inviteUserDto.email,
      fullName: inviteUserDto.fullName,
      password: hashedPassword,
      role,
      organizationId: ctx.user.organizationId,
      passwordChangeRequired: true,
      emailVerifiedAt: new Date(),
      status: UserStatus.PENDING,
    });
    const saved = await this.userRepository.save(user);

    return saved;
  }

  /**
   * On first login, transition pending → active and set joinedAt.
   * No-op if user is not pending.
   */
  async markPendingUserActivated(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId, status: UserStatus.PENDING },
      { status: UserStatus.ACTIVE, joinedAt: new Date() },
    );
  }

  private async sendInviteEmail(
    inviteUserDto: InviteUserDto,
    tempPassword: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', '');
    const loginUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/login` : null;

    const html = await this.emailTemplatesService.renderFile('emails/invite.ejs', {
      name: inviteUserDto.fullName || inviteUserDto.email,
      email: inviteUserDto.email,
      tempPassword,
      loginUrl,
    });

    await this.emailService.sendMail({
      to: inviteUserDto.email,
      subject: "You're invited to Onboard",
      html,
      text: `You're invited to Onboard. Sign in with email: ${inviteUserDto.email}, temporary password: ${tempPassword}.${loginUrl ? ` Login: ${loginUrl}` : ''}`,
    });
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { search?: string; status?: string; role?: string },
    _relations?: FindOptionsRelations<User>,
  ): Promise<PaginatedResult<User>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});

    const statusFilter = filters?.status?.toUpperCase();
    const roleFilter = filters?.role?.toUpperCase();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.organizationId',
        'user.createdAt',
        'user.updatedAt',
        'user.emailVerifiedAt',
        'user.passwordChangeRequired',
        'user.status',
        'user.joinedAt',
        'role.id',
        'role.name',
      ])
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const scope = getUserListScope(ctx);
    if (scope) {
      qb.andWhere(scope.clause, scope.params);
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(user.email ILIKE :search OR user.full_name ILIKE :search)',
        { search: term },
      );
    }
    if (
      statusFilter === UserStatus.ACTIVE ||
      statusFilter === UserStatus.DISABLED ||
      statusFilter === UserStatus.PENDING
    ) {
      qb.andWhere('user.status = :status', { status: statusFilter });
    }
    if (
      roleFilter === RoleName.SUPER_ADMIN ||
      roleFilter === RoleName.TENANT ||
      roleFilter === RoleName.MEMBER
    ) {
      qb.andWhere('role.name = :roleName', { roleName: roleFilter });
    }

    const countQb = this.userRepository.createQueryBuilder('user');
    if (scope) {
      countQb.andWhere(scope.clause, scope.params);
    }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      countQb.andWhere(
        '(user.email ILIKE :search OR user.full_name ILIKE :search)',
        { search: term },
      );
    }
    if (
      statusFilter === UserStatus.ACTIVE ||
      statusFilter === UserStatus.DISABLED ||
      statusFilter === UserStatus.PENDING
    ) {
      countQb.andWhere('user.status = :status', { status: statusFilter });
    }
    if (
      roleFilter === RoleName.SUPER_ADMIN ||
      roleFilter === RoleName.TENANT ||
      roleFilter === RoleName.MEMBER
    ) {
      countQb.leftJoin('user.role', 'role');
      countQb.andWhere('role.name = :roleName', { roleName: roleFilter });
    }

    const [data, total] = await Promise.all([
      qb.getMany(),
      countQb.getCount(),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  /** Load user entity only (for update/remove). */
  private async getOne(
    id: string,
    relations?: FindOptionsRelations<User>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: (relations as string[]) ?? ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    relations?: FindOptionsRelations<User>,
  ): Promise<User> {
    const defaultRelations: FindOptionsRelations<User> = {
      role: { permissions: true },
      organization: true,
    };
    const user = await this.userRepository.findOne({
      where: { id },
      relations: relations ?? defaultRelations,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

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

  async update(
    ctx: RequestContext,
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.getOne(id);

    const { role: roleName, ...rest } = updateUserDto;

    if (roleName !== undefined) {
      const role = await this.roleRepository.findOne({
        where: { name: roleName },
      });
      if (!role) {
        throw new BadRequestException(
          `Role ${roleName} not found. Please ensure roles are seeded.`,
        );
      }
      user.role = role;
    }

    if (rest.password) {
      rest.password = await hashPassword(rest.password);
      user.passwordChangeRequired = false;
    }

    Object.assign(user, rest);
    return this.userRepository.save(user);
  }

  async activate(ctx: RequestContext, id: string): Promise<User> {
    const user = await this.getOne(id);
    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  async deactivate(ctx: RequestContext, id: string): Promise<User> {
    const user = await this.getOne(id);
    user.status = UserStatus.DISABLED;
    return this.userRepository.save(user);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    if (ctx.user?.userId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const user = await this.getOne(id);
    await this.userRepository.remove(user);
  }

  /** Mark that a password reset email was sent (for rate limiting). */
  async markPasswordResetEmailSent(
    _ctx: RequestContext,
    userId: string,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      lastPasswordResetEmailAt: new Date(),
    });
  }

  /** Public check: whether any SUPER_ADMIN user exists (for initial setup flow). */
  async hasSuperAdmin(): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { role: { name: RoleName.SUPER_ADMIN } },
    });
    return count > 0;
  }
}
