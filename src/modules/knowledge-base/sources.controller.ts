import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseFilters,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SourcesService } from './sources.service';
import { CreateKBSourceDto } from './dto/create-source.dto';
import { UpdateKBSourceDto } from './dto/update-source.dto';
import { KBSource } from '../../common/entities/kb-source.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { RequestContext as RequestContextType } from '../../types/request';
import { kbSourceUploadOptions } from './multer-options';
import { UploadExceptionFilter } from './upload-exception.filter';
import type { PaginatedResult } from '../../types/pagination';

@Controller('knowledge-base/sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post()
  @Allow(Permission.CREATE_KB_SOURCE)
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', kbSourceUploadOptions))
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateKBSourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<KBSource> {
    return this.sourcesService.create(ctx, dto, file);
  }

  @Get()
  @Allow(Permission.READ_KB_SOURCE)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sourceType') sourceType?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedResult<KBSource>> {
    return this.sourcesService.findAll(
      ctx,
      { page, limit },
      { search, sourceType, status },
    );
  }

  @Post(':id/bots/:botId')
  @Allow(Permission.UPDATE_KB_SOURCE)
  linkBot(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Param('botId') botId: string,
  ): Promise<KBSource> {
    return this.sourcesService.linkBot(ctx, id, botId);
  }

  @Delete(':id/bots/:botId')
  @Allow(Permission.UPDATE_KB_SOURCE)
  unlinkBot(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Param('botId') botId: string,
  ): Promise<KBSource> {
    return this.sourcesService.unlinkBot(ctx, id, botId);
  }

  @Get(':id/download')
  @Allow(Permission.READ_KB_SOURCE)
  download(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    return this.sourcesService.download(ctx, id);
  }

  @Get(':id')
  @Allow(Permission.READ_KB_SOURCE)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<KBSource> {
    return this.sourcesService.findOne(ctx, id);
  }

  @Post(':id/refresh')
  @Allow(Permission.UPDATE_KB_SOURCE)
  refresh(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<KBSource> {
    return this.sourcesService.refresh(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_KB_SOURCE)
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', kbSourceUploadOptions))
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdateKBSourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<KBSource> {
    return this.sourcesService.update(ctx, id, dto, file);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_KB_SOURCE)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.sourcesService.remove(ctx, id);
  }
}
