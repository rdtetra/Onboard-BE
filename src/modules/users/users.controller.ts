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
import type { RequestContext as RequestContextType } from '../../types/request';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() createUserDto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.create(ctx, createUserDto);
  }

  @Get()
  findAll(@RequestContext() ctx: RequestContextType): Promise<User[]> {
    return this.usersService.findAll(ctx);
  }

  @Get(':id')
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<User> {
    return this.usersService.findOne(ctx, id);
  }

  @Patch(':id')
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(ctx, id, updateUserDto);
  }

  @Delete(':id')
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.usersService.remove(ctx, id);
  }
}
