import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../../common/entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { SourcesService } from '../knowledge-base/sources.service';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { parsePagination, toPaginatedResult } from '../../utils/pagination.util';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    private readonly sourcesService: SourcesService,
  ) {}

  async create(ctx: RequestContext, dto: CreateCollectionDto): Promise<Collection> {
    const collection = this.collectionRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
    });
    return this.collectionRepository.save(collection);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<Collection>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [data, total] = await this.collectionRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: ['sources'],
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id },
      relations: ['sources'],
    });
    if (!collection) throw new NotFoundException(`Collection with ID ${id} not found`);
    return collection;
  }

  async update(ctx: RequestContext, id: string, dto: UpdateCollectionDto): Promise<Collection> {
    const collection = await this.findOne(ctx, id);
    if (dto.name !== undefined) collection.name = dto.name.trim();
    if (dto.description !== undefined) collection.description = dto.description?.trim() ?? null;
    return this.collectionRepository.save(collection);
  }

  async addSource(ctx: RequestContext, collectionId: string, sourceId: string): Promise<Collection> {
    await this.findOne(ctx, collectionId);
    await this.sourcesService.setCollection(ctx, sourceId, collectionId);
    return this.findOne(ctx, collectionId);
  }

  async removeSource(ctx: RequestContext, collectionId: string, sourceId: string): Promise<Collection> {
    await this.findOne(ctx, collectionId);
    const source = await this.sourcesService.findOne(ctx, sourceId);
    if (source.collectionId !== collectionId) {
      throw new NotFoundException(`Source ${sourceId} is not in this collection`);
    }
    await this.sourcesService.setCollection(ctx, sourceId, null);
    return this.findOne(ctx, collectionId);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) throw new NotFoundException(`Collection with ID ${id} not found`);

    const sources = await this.sourcesService.findByCollectionId(ctx, id);
    for (const source of sources) {
      await this.sourcesService.setCollection(ctx, source.id, null);
    }
    await this.collectionRepository.remove(collection);
  }
}
