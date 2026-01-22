import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import { hashPassword } from '../../utils/crypto.util';
import { User } from '../../common/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { RequestContext } from '../../types/request';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(ctx: RequestContext, createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(ctx, createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(
    ctx: RequestContext,
    relations?: FindOptionsRelations<User>,
  ): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
      relations,
    });
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    relations?: FindOptionsRelations<User>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
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
    return this.userRepository.save(user);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const user = await this.findOne(ctx, id);
    await this.userRepository.remove(user);
  }
}
