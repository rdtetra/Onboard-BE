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
import { WidgetsService } from './widgets.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { Widget } from '../../common/entities/widget.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('widgets')
export class WidgetsController {
  constructor(private readonly widgetsService: WidgetsService) {}

  @Post()
  @Allow(Permission.CREATE_WIDGET)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() createWidgetDto: CreateWidgetDto,
  ): Promise<Widget> {
    return this.widgetsService.create(ctx, createWidgetDto);
  }

  @Get()
  @Allow(Permission.READ_WIDGET)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('botId') botId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<Widget>> {
    return this.widgetsService.findAll(ctx, { page, limit }, { botId, search });
  }

  @Get('by-bot/:botId')
  @Allow(Permission.READ_WIDGET)
  findByBot(
    @RequestContext() ctx: RequestContextType,
    @Param('botId') botId: string,
  ): Promise<Widget | null> {
    return this.widgetsService.findByBotId(ctx, botId);
  }

  @Get(':id')
  @Allow(Permission.READ_WIDGET)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Widget> {
    return this.widgetsService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_WIDGET)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() updateWidgetDto: UpdateWidgetDto,
  ): Promise<Widget> {
    return this.widgetsService.update(ctx, id, updateWidgetDto);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_WIDGET)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.widgetsService.remove(ctx, id);
  }
}
