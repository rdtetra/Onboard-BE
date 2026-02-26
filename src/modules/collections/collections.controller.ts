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
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { Collection } from '../../common/entities/collection.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @Allow(Permission.CREATE_COLLECTION)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateCollectionDto,
  ): Promise<Collection> {
    return this.collectionsService.create(ctx, dto);
  }

  @Get()
  @Allow(Permission.READ_COLLECTION)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<Collection>> {
    return this.collectionsService.findAll(ctx, { page, limit });
  }

  @Post(':id/sources/:sourceId')
  @Allow(Permission.UPDATE_COLLECTION)
  addSource(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ): Promise<Collection> {
    return this.collectionsService.addSource(ctx, id, sourceId);
  }

  @Delete(':id/sources/:sourceId')
  @Allow(Permission.UPDATE_COLLECTION)
  removeSource(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ): Promise<Collection> {
    return this.collectionsService.removeSource(ctx, id, sourceId);
  }

  @Get(':id')
  @Allow(Permission.READ_COLLECTION)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Collection> {
    return this.collectionsService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.UPDATE_COLLECTION)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<Collection> {
    return this.collectionsService.update(ctx, id, dto);
  }

  @Delete(':id')
  @Allow(Permission.DELETE_COLLECTION)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.collectionsService.remove(ctx, id);
  }
}
