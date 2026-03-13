import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Task } from '../../common/entities/task.entity';
import { Chip } from '../../common/entities/chip.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotsService } from '../bots/bots.service';
import { SourcesService } from '../knowledge-base/sources.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChipType } from '../../types/task';
import { RoleName } from '../../types/roles';
import { BotType } from '../../types/bot';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Chip)
    private readonly chipRepository: Repository<Chip>,
    private readonly botsService: BotsService,
    private readonly sourcesService: SourcesService,
  ) {}

  async create(ctx: RequestContext, dto: CreateTaskDto): Promise<Task> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const bot = await this.botsService.findOne(ctx, dto.botId);
    // REVERTED: General bots can have tasks. This might be reverted - uncomment below to restore "Only project bots can have tasks".
    // if (bot.botType !== BotType.PROJECT && bot.botType !== BotType.URL_SPECIFIC) {
    //   throw new BadRequestException('Only project bots can have tasks');
    // }

    const kbSources: KBSource[] = [];
    for (const sourceId of dto.kbSourceIds) {
      const source = await this.sourcesService.findOne(ctx, sourceId);
      kbSources.push(source);
    }

    const task = this.taskRepository.create({
      name: dto.name.trim(),
      introMessage: dto.introMessage.trim(),
      instruction: dto.instruction.trim(),
      targetUrls: dto.targetUrls,
      isActive: dto.isActive,
      botId: dto.botId,
    });
    const saved = await this.taskRepository.save(task);
    if (kbSources.length > 0) {
      saved.kbSources = kbSources;
      await this.taskRepository.save(saved);
    }
    if (dto.chips?.length) {
      const chips = this.chipRepository.create(
        dto.chips.map((c) => ({
          taskId: saved.id,
          type: c.type,
          chipName: c.chipName.trim(),
          chipText: c.chipText.trim(),
          url: c.type === ChipType.LINK && c.url ? c.url.trim() : null,
        })),
      );
      await this.chipRepository.save(chips);
    }
    return this.findOne(ctx, saved.id);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { botId?: string; search?: string; isActive?: boolean },
  ): Promise<PaginatedResult<Task>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? undefined
        : ctx.user.organizationId;
    if (!orgId && ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new BadRequestException(
        'Organization context required to list tasks',
      );
    }

    const { page, limit, skip } = parsePagination(pagination ?? {});

    const where: FindOptionsWhere<Task> = {};
    if (orgId) {
      where.bot = { organizationId: orgId };
    }
    if (filters?.botId) {
      where.botId = filters.botId;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search?.trim()) {
      where.name = ILike(`%${filters.search.trim()}%`);
    }

    const [data, total] = await this.taskRepository.findAndCount({
      where,
      relations: ['kbSources', 'chips'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Task> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['kbSources', 'chips'],
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    await this.botsService.findOne(ctx, task.botId);
    return task;
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(ctx, id);
    if (dto.name !== undefined) task.name = dto.name.trim();
    if (dto.introMessage !== undefined)
      task.introMessage = dto.introMessage.trim();
    if (dto.instruction !== undefined)
      task.instruction = dto.instruction.trim();
    if (dto.targetUrls !== undefined) task.targetUrls = dto.targetUrls;
    if (dto.isActive !== undefined) task.isActive = dto.isActive;
    if (dto.botId !== undefined) {
      const bot = await this.botsService.findOne(ctx, dto.botId);
      // REVERTED: General bots can have tasks. This might be reverted - uncomment below to restore "Only project bots can have tasks".
      // if (bot.botType !== BotType.PROJECT && bot.botType !== BotType.URL_SPECIFIC) {
      //   throw new BadRequestException('Only project bots can have tasks');
      // }
      task.botId = dto.botId;
    }
    if (dto.kbSourceIds !== undefined) {
      const kbSources: KBSource[] = [];
      for (const sourceId of dto.kbSourceIds) {
        const source = await this.sourcesService.findOne(ctx, sourceId);
        kbSources.push(source);
      }
      task.kbSources = kbSources;
    }
    await this.taskRepository.save(task);
    if (dto.chips !== undefined) {
      await this.chipRepository.delete({ taskId: id });
      if (dto.chips.length > 0) {
        const chips = this.chipRepository.create(
          dto.chips.map((c) => ({
            taskId: id,
            type: c.type,
            chipName: c.chipName.trim(),
            chipText: c.chipText.trim(),
            url: c.type === ChipType.LINK && c.url ? c.url.trim() : null,
          })),
        );
        await this.chipRepository.save(chips);
      }
    }
    return this.findOne(ctx, id);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const task = await this.findOne(ctx, id);
    const chips = await this.chipRepository.find({ where: { taskId: task.id } });
    if (chips.length > 0) {
      await this.chipRepository.softRemove(chips);
    }
    await this.taskRepository.softRemove(task);
  }
}
