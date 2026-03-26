import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from '../../common/entities/task.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('tasks')
export class TaskController {
  constructor(private readonly tasksService: TaskService) {}

  @Post()
  @Allow(Permission.CREATE_TASK)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasksService.create(ctx, createTaskDto);
  }

  @Get()
  @Allow(Permission.READ_TASK)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('botId') botId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<Task>> {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.tasksService.findAll(
      ctx,
      { page, limit },
      {
        botId,
        search,
        isActive: isActiveBool,
      },
    );
  }

  @Get(':id')
  @Allow(Permission.READ_TASK)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Task> {
    return this.tasksService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_TASK)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(ctx, id, updateTaskDto);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_TASK)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.remove(ctx, id);
  }
}
