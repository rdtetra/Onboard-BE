import {
  Injectable,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { KBSource } from '../../common/entities/kb-source.entity';
import { CreateKBSourceDto } from './dto/create-source.dto';
import { UpdateKBSourceDto } from './dto/update-source.dto';
import { SourceType, SourceStatus, RefreshSchedule } from '../../types/knowledge-base';
import type { RequestContext } from '../../types/request';
import { getSourceValueFromFile, getAbsolutePathForDownload } from './multer-options';
import { fileExists, createFileReadStream } from '../../utils/file.util';
import type { PaginatedResult } from '../../types/pagination';
import { parsePagination, toPaginatedResult } from '../../utils/pagination.util';

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(KBSource)
    private readonly kbSourceRepository: Repository<KBSource>,
  ) {}

  private getNextRefreshAt(schedule: RefreshSchedule, from: Date = new Date()): Date | null {
    if (schedule === RefreshSchedule.MANUAL) return null;
    const next = new Date(from);
    if (schedule === RefreshSchedule.DAILY) next.setDate(next.getDate() + 1);
    else if (schedule === RefreshSchedule.WEEKLY) next.setDate(next.getDate() + 7);
    else if (schedule === RefreshSchedule.MONTHLY) next.setMonth(next.getMonth() + 1);
    else return null;
    return next;
  }

  private validateCreateDto(dto: CreateKBSourceDto): void {
    if (dto.sourceType === SourceType.URL) {
      if (!dto.url?.trim()) throw new BadRequestException('URL is required for URL source type');
      if (dto.refreshSchedule === undefined || dto.refreshSchedule === null) {
        throw new BadRequestException('refreshSchedule is required for URL source type');
      }
    }
    if (dto.sourceType === SourceType.PDF || dto.sourceType === SourceType.DOCX) {
      if (!dto.fileKey?.trim()) throw new BadRequestException('fileKey is required for file source type');
    }
    if (dto.sourceType === SourceType.TXT) {
      if (dto.content === undefined || dto.content === null) {
        throw new BadRequestException('content is required for TXT source type');
      }
    }
  }

  async create(ctx: RequestContext, dto: CreateKBSourceDto): Promise<KBSource> {
    this.validateCreateDto(dto);
    const sourceValue =
      dto.sourceType === SourceType.URL
        ? dto.url!
        : dto.sourceType === SourceType.TXT
          ? dto.content!
          : dto.fileKey!;
    const refreshSchedule = dto.sourceType === SourceType.URL ? dto.refreshSchedule! : null;
    const nextRefreshScheduledAt =
      refreshSchedule != null ? this.getNextRefreshAt(refreshSchedule) : null;
    const source = this.kbSourceRepository.create({
      name: dto.name,
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
    if (!name?.trim()) throw new BadRequestException('name is required');
    if (sourceType !== SourceType.PDF && sourceType !== SourceType.DOCX) {
      throw new BadRequestException('sourceType must be PDF or DOCX for file upload');
    }
    if (!file?.filename) throw new BadRequestException('file is required');
    const sourceValue = getSourceValueFromFile(file.filename);
    const source = this.kbSourceRepository.create({
      name: name.trim(),
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
    filters?: { search?: string; sourceType?: string },
  ): Promise<PaginatedResult<KBSource>> {
    if (filters?.sourceType != null && filters.sourceType !== '' && !Object.values(SourceType).includes(filters.sourceType as SourceType)) {
      throw new BadRequestException(`sourceType must be one of: ${Object.values(SourceType).join(', ')}`);
    }
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const where: FindOptionsWhere<KBSource> = {};
    if (filters?.sourceType) where.sourceType = filters.sourceType as SourceType;
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

  async findOne(ctx: RequestContext, id: string): Promise<KBSource> {
    const source = await this.kbSourceRepository.findOne({ where: { id } });
    if (!source) throw new NotFoundException(`Knowledge base source with ID ${id} not found`);
    return source;
  }

  async download(ctx: RequestContext, id: string): Promise<StreamableFile> {
    const source = await this.findOne(ctx, id);
    if (source.sourceType !== SourceType.PDF && source.sourceType !== SourceType.DOCX) {
      throw new BadRequestException('Only PDF and DOCX sources can be downloaded');
    }
    const absolutePath = getAbsolutePathForDownload(source.sourceValue);
    if (!absolutePath || !fileExists(absolutePath)) {
      throw new NotFoundException('File not found or not available for download');
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

  async update(ctx: RequestContext, id: string, dto: UpdateKBSourceDto): Promise<KBSource> {
    const source = await this.findOne(ctx, id);
    const payload = this.getUpdatePayload(source, dto);
    Object.assign(source, payload);
    return this.kbSourceRepository.save(source);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const source = await this.findOne(ctx, id);
    await this.kbSourceRepository.softRemove(source);
  }

  private getUpdatePayload(existing: KBSource, dto: UpdateKBSourceDto): Partial<KBSource> {
    const payload: Partial<KBSource> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (existing.sourceType === SourceType.URL) {
      if (dto.url !== undefined) payload.sourceValue = dto.url.trim();
      if (dto.refreshSchedule !== undefined) {
        payload.refreshSchedule = dto.refreshSchedule;
        payload.nextRefreshScheduledAt =
          dto.refreshSchedule === RefreshSchedule.MANUAL
            ? null
            : this.getNextRefreshAt(dto.refreshSchedule, existing.lastRefreshed ?? new Date());
      }
    }
    if (existing.sourceType === SourceType.PDF || existing.sourceType === SourceType.DOCX) {
      if (dto.fileKey !== undefined) payload.sourceValue = dto.fileKey.trim();
    }
    if (existing.sourceType === SourceType.TXT) {
      if (dto.content !== undefined) payload.sourceValue = dto.content;
    }
    return payload;
  }
}
