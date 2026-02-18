import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
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

    return this.userRepository.save(user);
  }

  async inviteUser(ctx: RequestContext, inviteUserDto: InviteUserDto): Promise<User> {
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
      passwordChangeRequired: true,
    });
    return this.userRepository.save(user);
  }

  async findAll(
    ctx: RequestContext,
    query?: { page?: string; limit?: string },
    relations?: FindOptionsRelations<User>,
  ): Promise<PaginatedResult<User>> {
    const { page, limit, skip } = parsePagination(query ?? {});
    const [data, total] = await this.userRepository.findAndCount({
      select: ['id', 'email', 'fullName', 'createdAt', 'updatedAt', 'emailVerifiedAt', 'passwordChangeRequired', 'isActive'],
      relations,
      take: limit,
      skip,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    relations?: FindOptionsRelations<User>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'createdAt', 'updatedAt', 'emailVerifiedAt', 'passwordChangeRequired', 'isActive'],
      relations,
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

  async update(ctx: RequestContext, id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(ctx, id);

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
    const user = await this.findOne(ctx, id);
    await this.userRepository.remove(user);
  }
}
