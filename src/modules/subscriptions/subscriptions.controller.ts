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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Subscription } from '../../common/entities/subscription.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Allow(Permission.UPDATE_SUBSCRIPTION)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionsService.create(ctx, dto);
  }

  @Get()
  @Allow(Permission.READ_SUBSCRIPTION)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<Subscription>> {
    return this.subscriptionsService.findAll(ctx, { page, limit });
  }

  @Get('current')
  @Allow(Permission.READ_SUBSCRIPTION)
  getCurrent(
    @RequestContext() ctx: RequestContextType,
  ): Promise<Subscription | null> {
    return this.subscriptionsService.getCurrent(ctx);
  }

  @Get(':id')
  @Allow(Permission.READ_SUBSCRIPTION)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Subscription> {
    return this.subscriptionsService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_SUBSCRIPTION)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionsService.update(ctx, id, dto);
  }

  @Delete(':id')
  @Allow(Permission.UPDATE_SUBSCRIPTION)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.subscriptionsService.remove(ctx, id);
  }
}
