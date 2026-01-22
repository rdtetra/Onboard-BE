import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../common/entities/user.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Allow(Permission.CREATE_USER)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() createUserDto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.create(ctx, createUserDto);
  }

  @Get()
  @Allow(Permission.READ_USER)
  findAll(@RequestContext() ctx: RequestContextType): Promise<User[]> {
    return this.usersService.findAll(ctx);
  }

  @Get(':id')
  @Allow(Permission.READ_USER)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<User> {
    return this.usersService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_USER)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(ctx, id, updateUserDto);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_USER)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.usersService.remove(ctx, id);
  }
}
