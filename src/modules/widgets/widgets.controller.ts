import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WidgetsService } from './widgets.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { Widget } from '../../common/entities/widget.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import { WidgetAppearance } from '../../types/widget';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { widgetLogoUploadOptions } from './widget-logo-upload.options';
import { UploadExceptionFilter } from '../knowledge-base/upload-exception.filter';

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
    @Query('mode') mode?: WidgetAppearance,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<Widget>> {
    return this.widgetsService.findAll(ctx, { page, limit }, { botId, mode, search });
  }

  @Get('by-bot/:botId')
  @Allow(Permission.READ_WIDGET)
  findByBotAndMode(
    @RequestContext() ctx: RequestContextType,
    @Param('botId') botId: string,
    @Query('mode') mode: string,
  ): Promise<Widget | null> {
    return this.widgetsService.findByBotIdAndMode(ctx, botId, mode);
  }

  @Patch('by-bot/:botId/mode/:mode')
  @Allow(Permission.UPDATE_WIDGET)
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('logo', widgetLogoUploadOptions))
  updateByBotAndMode(
    @RequestContext() ctx: RequestContextType,
    @Param('botId') botId: string,
    @Param('mode') mode: string,
    @Body() updateWidgetDto: UpdateWidgetDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ): Promise<Widget> {
    return this.widgetsService.updateByBotIdAndMode(ctx, botId, mode, updateWidgetDto, logoFile);
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
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('logo', widgetLogoUploadOptions))
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() updateWidgetDto: UpdateWidgetDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ): Promise<Widget> {
    return this.widgetsService.update(ctx, id, updateWidgetDto, logoFile);
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
