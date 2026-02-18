import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseFilters,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SourcesService } from './sources.service';
import { CreateKBSourceDto } from './dto/create-source.dto';
import { UpdateKBSourceDto } from './dto/update-source.dto';
import { KBSource } from '../../common/entities/kb-source.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import { kbSourceUploadOptions } from './multer-options';
import { SourceType } from '../../types/knowledge-base';
import { UploadExceptionFilter } from './upload-exception.filter';
import type { PaginatedResult } from '../../types/pagination';

@Controller('knowledge-base/sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post()
  @Allow(Permission.CREATE_KB_SOURCE)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateKBSourceDto,
  ): Promise<KBSource> {
    return this.sourcesService.create(ctx, dto);
  }

  @Post('upload')
  @Allow(Permission.CREATE_KB_SOURCE)
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', kbSourceUploadOptions))
  upload(
    @RequestContext() ctx: RequestContextType,
    @Body('name') name: string,
    @Body('sourceType') sourceType: SourceType,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<KBSource> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.sourcesService.createFromUpload(
      ctx,
      name,
      sourceType as SourceType.PDF | SourceType.DOCX,
      file,
    );
  }

  @Get()
  @Allow(Permission.READ_KB_SOURCE)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sourceType') sourceType?: string,
  ): Promise<PaginatedResult<KBSource>> {
    return this.sourcesService.findAll(ctx, { page, limit, search, sourceType });
  }

  @Get(':id')
  @Allow(Permission.READ_KB_SOURCE)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<KBSource> {
    return this.sourcesService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_KB_SOURCE)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdateKBSourceDto,
  ): Promise<KBSource> {
    return this.sourcesService.update(ctx, id, dto);
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
