import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../../common/entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { SourcesService } from '../knowledge-base/sources.service';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    private readonly sourcesService: SourcesService,
  ) {}

  async create(
    ctx: RequestContext,
    dto: CreateCollectionDto,
  ): Promise<Collection> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to create collections',
      );
    }

    const collection = this.collectionRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      organizationId: ctx.user.organizationId,
      createdById: ctx.user.userId,
    });
    return this.collectionRepository.save(collection);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<Collection>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (
      !ctx.user.organizationId &&
      ctx.user.roleName !== RoleName.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Organization context required to list collections',
      );
    }

    const { page, limit, skip } = parsePagination(pagination ?? {});
    const where: { organizationId?: string } = {};
    if (ctx.user.organizationId) {
      where.organizationId = ctx.user.organizationId;
    }
    const [data, total] = await this.collectionRepository.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: ['sources'],
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Collection> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const collection = await this.collectionRepository.findOne({
      where: { id },
      relations: ['sources'],
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }
    if (
      ctx.user.roleName !== RoleName.SUPER_ADMIN &&
      collection.organizationId !== ctx.user.organizationId
    ) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }
    return collection;
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<Collection> {
    const collection = await this.findOne(ctx, id);

    if (dto.name !== undefined) {
      collection.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      collection.description = dto.description?.trim() ?? null;
    }

    return this.collectionRepository.save(collection);
  }

  async addSource(
    ctx: RequestContext,
    collectionId: string,
    sourceId: string,
  ): Promise<Collection> {
    const collection = await this.findOne(ctx, collectionId);
    const source = await this.sourcesService.findOne(ctx, sourceId);
    if (source.organizationId !== collection.organizationId) {
      throw new NotFoundException(
        'Source does not belong to the same organization as the collection',
      );
    }
    await this.sourcesService.setCollection(ctx, sourceId, collectionId);
    return this.findOne(ctx, collectionId);
  }

  async removeSource(
    ctx: RequestContext,
    collectionId: string,
    sourceId: string,
  ): Promise<Collection> {
    const collection = await this.findOne(ctx, collectionId);
    const source = await this.sourcesService.findOne(ctx, sourceId);
    if (source.collectionId !== collectionId) {
      throw new NotFoundException(
        `Source ${sourceId} is not in this collection`,
      );
    }
    await this.sourcesService.setCollection(ctx, sourceId, null);
    return this.findOne(ctx, collectionId);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    const sources = await this.sourcesService.findByCollectionId(ctx, id);
    for (const source of sources) {
      await this.sourcesService.setCollection(ctx, source.id, null);
    }
    await this.collectionRepository.remove(collection);
  }
}
