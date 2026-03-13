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
import { BotsService } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { Bot } from '../../common/entities/bot.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import { BotType } from '../../types/bot';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import type { BotsOverview, BotWithTokensUsed } from '../../types/bots-overview';

@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Post()
  @Allow(Permission.CREATE_BOT)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() createBotDto: CreateBotDto,
  ): Promise<Bot> {
    return this.botsService.create(ctx, createBotDto);
  }

  @Get()
  @Allow(Permission.READ_BOT)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('botType') botType?: BotType,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<BotWithTokensUsed>> {
    return this.botsService.findAll(ctx, { page, limit }, { botType, search });
  }

  @Get('options')
  @Allow(Permission.READ_BOT)
  findOptions(
    @RequestContext() ctx: RequestContextType,
  ): Promise<{ id: string; name: string }[]> {
    return this.botsService.findOptions(ctx);
  }

  @Get('overview')
  @Allow(Permission.READ_BOT)
  getOverview(
    @RequestContext() ctx: RequestContextType,
    @Query('botId') botId?: string,
  ): Promise<BotsOverview> {
    return this.botsService.getOverview(ctx, botId);
  }

  @Get(':id/kb-sources')
  @Allow(Permission.READ_BOT)
  findKbSources(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ) {
    return this.botsService.findKbSources(ctx, id);
  }

  @Post(':id/kb-sources/:sourceId')
  @Allow(Permission.UPDATE_BOT)
  linkKbSource(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.botsService.linkKbSource(ctx, id, sourceId);
  }

  @Delete(':id/kb-sources/:sourceId')
  @Allow(Permission.UPDATE_BOT)
  unlinkKbSource(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.botsService.unlinkKbSource(ctx, id, sourceId);
  }

  @Get(':id')
  @Allow(Permission.READ_BOT)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Bot> {
    return this.botsService.findOne(ctx, id);
  }

  @Patch(':id/archive')
  @Allow(Permission.UPDATE_BOT)
  archive(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Bot> {
    return this.botsService.archive(ctx, id);
  }

  @Patch(':id/unarchive')
  @Allow(Permission.UPDATE_BOT)
  unarchive(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Bot> {
    return this.botsService.unarchive(ctx, id);
  }

  @Patch(':id/disable')
  @Allow(Permission.UPDATE_BOT)
  disable(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Bot> {
    return this.botsService.disable(ctx, id);
  }

  @Patch(':id/enable')
  @Allow(Permission.UPDATE_BOT)
  enable(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Bot> {
    return this.botsService.enable(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_BOT)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() updateBotDto: UpdateBotDto,
  ): Promise<Bot> {
    return this.botsService.update(ctx, id, updateBotDto);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_BOT)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.botsService.remove(ctx, id);
  }
}
