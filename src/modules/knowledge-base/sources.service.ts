import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { KBSource } from '../../common/entities/kb-source.entity';
import { CreateKBSourceDto } from './dto/create-source.dto';
import { BotKbLinkService } from '../bot-kb-link/bot-kb-link.service';
import { BotsService } from '../bots/bots.service';
import { UpdateKBSourceDto } from './dto/update-source.dto';
import {
  SourceType,
  SourceStatus,
  RefreshSchedule,
} from '../../types/knowledge-base';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import {
  getSourceValueFromFile,
  getAbsolutePathForDownload,
} from './multer-options';
import { fileExists, createFileReadStream } from '../../utils/file.util';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(KBSource)
    private readonly kbSourceRepository: Repository<KBSource>,
    private readonly botKbLinkService: BotKbLinkService,
    private readonly botsService: BotsService,
  ) {}

  private getNextRefreshAt(
    schedule: RefreshSchedule,
    from: Date = new Date(),
  ): Date | null {
    if (schedule === RefreshSchedule.MANUAL) {
      return null;
    }

    const next = new Date(from);
    if (schedule === RefreshSchedule.DAILY) {
      next.setDate(next.getDate() + 1);
    } else if (schedule === RefreshSchedule.WEEKLY) {
      next.setDate(next.getDate() + 7);
    } else if (schedule === RefreshSchedule.MONTHLY) {
      next.setMonth(next.getMonth() + 1);
    } else {
      return null;
    }

    return next;
  }

  async create(ctx: RequestContext, dto: CreateKBSourceDto): Promise<KBSource> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to create KB sources',
      );
    }

    const sourceValue =
      dto.sourceType === SourceType.URL
        ? dto.url!
        : dto.sourceType === SourceType.TXT
          ? dto.content!
          : dto.fileKey!;
    const refreshSchedule =
      dto.sourceType === SourceType.URL ? dto.refreshSchedule! : null;
    const nextRefreshScheduledAt =
      refreshSchedule != null ? this.getNextRefreshAt(refreshSchedule) : null;
    const source = this.kbSourceRepository.create({
      name: dto.name,
      organizationId: ctx.user.organizationId,
      sourceType: dto.sourceType,
      sourceValue: sourceValue.trim(),
      status: SourceStatus.READY,
      refreshSchedule,
      linkedBots: 0,
      lastRefreshed: null,
      nextRefreshScheduledAt,
    });
    return this.kbSourceRepository.save(source);
  }

  async createFromUpload(
    ctx: RequestContext,
    name: string,
    sourceType: SourceType.PDF | SourceType.DOCX,
    file: Express.Multer.File,
  ): Promise<KBSource> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to create KB sources',
      );
    }
    if (!name?.trim()) {
      throw new BadRequestException('name is required');
    }
    if (sourceType !== SourceType.PDF && sourceType !== SourceType.DOCX) {
      throw new BadRequestException(
        'sourceType must be PDF or DOCX for file upload',
      );
    }
    if (!file?.filename) {
      throw new BadRequestException('file is required');
    }

    const sourceValue = getSourceValueFromFile(file.filename);
    const source = this.kbSourceRepository.create({
      name: name.trim(),
      organizationId: ctx.user.organizationId,
      sourceType,
      sourceValue,
      fileSizeBytes: file.size ?? null,
      status: SourceStatus.READY,
      refreshSchedule: null,
      linkedBots: 0,
      lastRefreshed: null,
      nextRefreshScheduledAt: null,
    });
    return this.kbSourceRepository.save(source);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: { search?: string; sourceType?: string; organizationId?: string },
  ): Promise<PaginatedResult<KBSource>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const orgId =
      ctx.user.roleName === RoleName.SUPER_ADMIN
        ? (filters?.organizationId ?? ctx.user.organizationId)
        : ctx.user.organizationId;
    if (!orgId && ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new BadRequestException(
        'Organization context required to list KB sources',
      );
    }
    if (
      filters?.sourceType != null &&
      filters.sourceType !== '' &&
      !Object.values(SourceType).includes(filters.sourceType as SourceType)
    ) {
      throw new BadRequestException(
        `sourceType must be one of: ${Object.values(SourceType).join(', ')}`,
      );
    }

    const { page, limit, skip } = parsePagination(pagination ?? {});
    const where: FindOptionsWhere<KBSource> = {};
    if (orgId) {
      where.organizationId = orgId;
    }
    if (filters?.sourceType) {
      where.sourceType = filters.sourceType as SourceType;
    }
    if (filters?.search?.trim()) {
      where.name = ILike(`%${filters.search.trim()}%`);
    }
    const [data, total] = await this.kbSourceRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    options?: { relations?: (keyof KBSource)[] },
  ): Promise<KBSource> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const source = await this.kbSourceRepository.findOne({
      where: { id },
      relations: options?.relations,
    });

    if (!source) {
      throw new NotFoundException(
        `Knowledge base source with ID ${id} not found`,
      );
    }
    if (
      ctx.user.roleName !== RoleName.SUPER_ADMIN &&
      source.organizationId !== ctx.user.organizationId
    ) {
      throw new NotFoundException(
        `Knowledge base source with ID ${id} not found`,
      );
    }
    return source;
  }

  async download(ctx: RequestContext, id: string): Promise<StreamableFile> {
    const source = await this.findOne(ctx, id);
    if (
      source.sourceType !== SourceType.PDF &&
      source.sourceType !== SourceType.DOCX
    ) {
      throw new BadRequestException(
        'Only PDF and DOCX sources can be downloaded',
      );
    }
    const absolutePath = getAbsolutePathForDownload(source.sourceValue);
    if (!absolutePath || !fileExists(absolutePath)) {
      throw new NotFoundException(
        'File not found or not available for download',
      );
    }
    const ext = source.sourceType === SourceType.PDF ? '.pdf' : '.docx';
    const mimeType =
      source.sourceType === SourceType.PDF
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const downloadName = `${source.name.replace(/[^\w\s.-]/g, '_')}${ext}`;
    const stream = createFileReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `attachment; filename="${downloadName}"`,
    });
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateKBSourceDto,
  ): Promise<KBSource> {
    const source = await this.findOne(ctx, id);
    const payload = this.getUpdatePayload(source, dto);
    Object.assign(source, payload);
    return this.kbSourceRepository.save(source);
  }

  async refresh(ctx: RequestContext, id: string): Promise<KBSource> {
    const source = await this.findOne(ctx, id);
    if (source.sourceType !== SourceType.URL) {
      throw new BadRequestException(
        'Refresh is only supported for URL sources',
      );
    }
    source.lastRefreshed = new Date();
    return this.kbSourceRepository.save(source);
  }

  async linkBot(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    const source = await this.findOne(ctx, sourceId);
    const bot = await this.botsService.findOne(ctx, botId);
    if (source.organizationId !== bot.organizationId) {
      throw new BadRequestException(
        'Bot and source must belong to the same organization',
      );
    }
    return this.botKbLinkService.link(source, bot);
  }

  async unlinkBot(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    const source = await this.findOne(ctx, sourceId, {
      relations: ['bots'],
    });
    await this.botsService.findOne(ctx, botId);
    return this.botKbLinkService.unlink(source, botId);
  }

  async setCollection(
    ctx: RequestContext,
    sourceId: string,
    collectionId: string | null,
  ): Promise<KBSource> {
    const source = await this.findOne(ctx, sourceId);
    source.collectionId = collectionId;
    return this.kbSourceRepository.save(source);
  }

  async findByCollectionId(
    ctx: RequestContext,
    collectionId: string,
  ): Promise<KBSource[]> {
    return this.kbSourceRepository.find({
      where: { collectionId },
    });
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const source = await this.findOne(ctx, id);
    source.collectionId = null;
    await this.kbSourceRepository.save(source);
    await this.kbSourceRepository.softRemove(source);
  }

  private getUpdatePayload(
    existing: KBSource,
    dto: UpdateKBSourceDto,
  ): Partial<KBSource> {
    const payload: Partial<KBSource> = {};

    if (dto.name !== undefined) {
      payload.name = dto.name;
    }
    if (existing.sourceType === SourceType.URL) {
      if (dto.url !== undefined) {
        payload.sourceValue = dto.url.trim();
      }
      if (dto.refreshSchedule !== undefined) {
        payload.refreshSchedule = dto.refreshSchedule;
        payload.nextRefreshScheduledAt =
          dto.refreshSchedule === RefreshSchedule.MANUAL
            ? null
            : this.getNextRefreshAt(
                dto.refreshSchedule,
                existing.lastRefreshed ?? new Date(),
              );
      }
    }
    if (
      existing.sourceType === SourceType.PDF ||
      existing.sourceType === SourceType.DOCX
    ) {
      if (dto.fileKey !== undefined) {
        payload.sourceValue = dto.fileKey.trim();
      }
    }
    if (existing.sourceType === SourceType.TXT) {
      if (dto.content !== undefined) {
        payload.sourceValue = dto.content;
      }
    }

    return payload;
  }
}
