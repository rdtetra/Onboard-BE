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
import { UpdateKBSourceDto } from './dto/update-source.dto';
import {
  SourceType,
  SourceStatus,
  RefreshSchedule,
} from '../../common/enums/knowledge-base.enum';
import { RoleName } from '../../common/enums/roles.enum';
import type { RequestContext } from '../../types/request';
import { getAbsolutePathForDownload } from './multer-options';
import { fileExists, createFileReadStream } from '../../utils/file.util';
import { StorageService } from '../storage/storage.service';
import { KbRetrievalService } from '../kb-retrieval/kb-retrieval.service';
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
    private readonly storageService: StorageService,
    private readonly kbRetrievalService: KbRetrievalService,
  ) {}

  private reindexSource(ctx: RequestContext, source: KBSource): void {
    this.kbRetrievalService.enqueueIndexForSource(ctx, source);
  }

  private isIndexableSourceType(sourceType: SourceType): boolean {
    return (
      sourceType === SourceType.URL ||
      sourceType === SourceType.TXT ||
      sourceType === SourceType.PDF ||
      sourceType === SourceType.DOCX
    );
  }

  /** Total KB source count for current scope (all for super admin, org for tenant). Excludes soft-deleted. */
  async countAll(ctx: RequestContext): Promise<number> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (ctx.user.roleName === RoleName.SUPER_ADMIN) {
      return this.kbSourceRepository.count();
    }
    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'Organization context required to count KB sources',
      );
    }
    return this.kbSourceRepository.count({
      where: { organizationId: ctx.user.organizationId },
    });
  }

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

  async create(
    ctx: RequestContext,
    dto: CreateKBSourceDto,
    file?: Express.Multer.File,
  ): Promise<KBSource> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!ctx.user.organizationId) {
      throw new BadRequestException(
        'You must belong to an organization to create KB sources',
      );
    }

    if (file?.buffer) {
      if (!dto.name?.trim()) {
        throw new BadRequestException('name is required');
      }
      if (
        dto.sourceType !== SourceType.PDF &&
        dto.sourceType !== SourceType.DOCX
      ) {
        throw new BadRequestException(
          'sourceType must be PDF or DOCX when uploading a file',
        );
      }
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      let s3Key: string;
      try {
        s3Key = await this.storageService.uploadKbSourceFile(
          ctx.user.organizationId,
          fileId,
          file.buffer,
          file.mimetype,
        );
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'File upload failed',
        );
      }
      const source = this.kbSourceRepository.create({
        name: dto.name.trim(),
        organizationId: ctx.user.organizationId,
        sourceType: dto.sourceType,
        sourceValue: s3Key,
        fileSizeBytes: file.size ?? null,
        status: SourceStatus.PROCESSING,
        refreshSchedule: null,
        lastRefreshed: null,
        nextRefreshScheduledAt: null,
      });
      const saved = await this.kbSourceRepository.save(source);
      const withBots = await this.kbSourceRepository.findOne({
        where: { id: saved.id },
        relations: ['bots'],
      });
      if (withBots) {
        this.reindexSource(ctx, withBots);
        return withBots;
      }
      return saved;
    }

    if (
      dto.sourceType === SourceType.PDF ||
      dto.sourceType === SourceType.DOCX
    ) {
      if (!dto.fileKey?.trim()) {
        throw new BadRequestException(
          'fileKey is required for PDF/DOCX when not uploading a file',
        );
      }
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
      status: this.isIndexableSourceType(dto.sourceType)
        ? SourceStatus.PROCESSING
        : SourceStatus.READY,
      refreshSchedule,
      lastRefreshed: null,
      nextRefreshScheduledAt,
    });
    const saved = await this.kbSourceRepository.save(source);
    const withBots = await this.kbSourceRepository.findOne({
      where: { id: saved.id },
      relations: ['bots'],
    });
    if (withBots) {
      this.reindexSource(ctx, withBots);
      return withBots;
    }
    return saved;
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: {
      search?: string;
      sourceType?: string;
      status?: string;
      organizationId?: string;
    },
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
    const statusFilter = filters?.status?.toUpperCase();
    if (
      statusFilter != null &&
      statusFilter !== '' &&
      !Object.values(SourceStatus).includes(statusFilter as SourceStatus)
    ) {
      throw new BadRequestException(
        `status must be one of: ${Object.values(SourceStatus).join(', ')}`,
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
    if (
      statusFilter === SourceStatus.READY ||
      statusFilter === SourceStatus.PROCESSING ||
      statusFilter === SourceStatus.FAILED
    ) {
      where.status = statusFilter as SourceStatus;
    }
    if (filters?.search?.trim()) {
      where.name = ILike(`%${filters.search.trim()}%`);
    }
    const [data, total] = await this.kbSourceRepository.findAndCount({
      where,
      relations: ['bots'],
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
      relations: options?.relations ?? ['bots'],
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

    const mimeType =
      source.sourceType === SourceType.PDF
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const ext = source.sourceType === SourceType.PDF ? '.pdf' : '.docx';
    const downloadName = `${source.name.replace(/[^\w\s.-]/g, '_')}${ext}`;

    if (this.storageService.isKbSourceS3Key(source.sourceValue)) {
      try {
        const { stream, contentLength } =
          await this.storageService.getKbSourceFileStream(source.sourceValue);
        return new StreamableFile(stream, {
          type: mimeType,
          disposition: `attachment; filename="${downloadName}"`,
          length: contentLength,
        });
      } catch {
        throw new NotFoundException(
          'File not found or not available for download',
        );
      }
    }

    const absolutePath = getAbsolutePathForDownload(source.sourceValue);
    if (!absolutePath || !fileExists(absolutePath)) {
      throw new NotFoundException(
        'File not found or not available for download',
      );
    }
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
    file?: Express.Multer.File,
  ): Promise<KBSource> {
    const source = await this.findOne(ctx, id);
    const payload = this.getUpdatePayload(source, dto);

    if (file?.buffer) {
      if (
        source.sourceType !== SourceType.PDF &&
        source.sourceType !== SourceType.DOCX
      ) {
        throw new BadRequestException(
          'Only PDF and DOCX sources can be updated with a file upload',
        );
      }
      if (!ctx.user?.organizationId) {
        throw new BadRequestException('Organization context required');
      }
      try {
        const s3Key = await this.storageService.uploadKbSourceFile(
          ctx.user.organizationId,
          id,
          file.buffer,
          file.mimetype,
        );
        payload.sourceValue = s3Key;
        payload.fileSizeBytes = file.size ?? null;
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'File upload failed',
        );
      }
    }

    Object.assign(source, payload);
    if (this.isIndexableSourceType(source.sourceType)) {
      source.status = SourceStatus.PROCESSING;
    }
    const saved = await this.kbSourceRepository.save(source);
    const withBots = await this.kbSourceRepository.findOne({
      where: { id: saved.id },
      relations: ['bots'],
    });
    if (withBots) {
      this.reindexSource(ctx, withBots);
      return withBots;
    }
    return saved;
  }

  async refresh(ctx: RequestContext, id: string): Promise<KBSource> {
    const source = await this.findOne(ctx, id);
    if (source.sourceType !== SourceType.URL) {
      throw new BadRequestException(
        'Refresh is only supported for URL sources',
      );
    }
    source.status = SourceStatus.PROCESSING;
    const saved = await this.kbSourceRepository.save(source);
    const withBots = await this.kbSourceRepository.findOne({
      where: { id: saved.id },
      relations: ['bots'],
    });
    if (withBots) {
      this.reindexSource(ctx, withBots);
      return withBots;
    }
    return saved;
  }

  async linkBot(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    await this.botKbLinkService.linkByIds(ctx, sourceId, botId);
    return this.findOne(ctx, sourceId);
  }

  async unlinkBot(
    ctx: RequestContext,
    sourceId: string,
    botId: string,
  ): Promise<KBSource> {
    await this.botKbLinkService.unlinkByIds(ctx, sourceId, botId);
    return this.findOne(ctx, sourceId);
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

  /** Total storage (file_size_bytes) for the current org, excluding soft-deleted sources. */
  async getTotalStorageBytesForOrganization(
    ctx: RequestContext,
  ): Promise<number> {
    const orgId = ctx.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }
    const result = await this.kbSourceRepository
      .createQueryBuilder('kb')
      .select('COALESCE(SUM(kb.file_size_bytes), 0)', 'sum')
      .where('kb.organization_id = :orgId', { orgId })
      .getRawOne<{ sum: string }>();
    return Math.floor(parseFloat(result?.sum ?? '0'));
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const source = await this.findOne(ctx, id);
    source.collectionId = null;
    await this.kbSourceRepository.save(source);
    if (
      (source.sourceType === SourceType.PDF ||
        source.sourceType === SourceType.DOCX) &&
      source.sourceValue &&
      this.storageService.isKbSourceS3Key(source.sourceValue)
    ) {
      try {
        await this.storageService.deleteKbSourceFile(source.sourceValue);
      } catch {
        // Continue with soft-remove even if S3 delete fails (e.g. file already gone)
      }
    }
    await this.kbSourceRepository.remove(source);
  }

  async markIndexedNow(sourceId: string): Promise<void> {
    await this.kbSourceRepository.update(
      { id: sourceId },
      { lastRefreshed: new Date() },
    );
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
