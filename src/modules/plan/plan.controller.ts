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
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from '../../common/entities/plan.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('plans')
export class PlanController {
  constructor(private readonly plansService: PlanService) {}

  @Post()
  @Allow(Permission.CREATE_PLAN)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreatePlanDto,
  ): Promise<Plan> {
    return this.plansService.create(ctx, dto);
  }

  @Get()
  @Allow(Permission.READ_PLAN)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<Plan>> {
    return this.plansService.findAll(ctx, { page, limit });
  }

  @Get(':id')
  @Allow(Permission.READ_PLAN)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Plan> {
    return this.plansService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_PLAN)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<Plan> {
    return this.plansService.update(ctx, id, dto);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_PLAN)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.plansService.remove(ctx, id);
  }
}
