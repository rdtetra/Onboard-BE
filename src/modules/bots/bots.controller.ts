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
  ): Promise<Bot[]> {
    return this.botsService.findAll(ctx, { botType, search });
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

  @Patch(':id/disable')
  @Allow(Permission.UPDATE_BOT)
  disable(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Bot> {
    return this.botsService.disable(ctx, id);
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
