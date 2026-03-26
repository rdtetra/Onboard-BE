import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { KBChunk } from '../../common/entities/kb-chunk.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { SourceStatus, SourceType } from '../../types/knowledge-base';
import type { RetrievedChunk } from '../../types/kb-retrieval';
import { BotsService } from '../bots/bots.service';
import { RequestContextId, type RequestContext } from '../../types/request';
import { createInternalContext } from '../../common/utils/request-context.util';
import { StorageService } from '../storage/storage.service';
import { getAbsolutePathForDownload } from '../knowledge-base/multer-options';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class KbRetrievalService implements OnModuleInit {
  private readonly logger = new Logger(KbRetrievalService.name);
  private vectorEnabled = false;

  constructor(
    @InjectRepository(KBChunk)
    private readonly kbChunkRepository: Repository<KBChunk>,
    // Keep direct repo access here to update lastRefreshed
    // without introducing a circular service dependency with SourcesService.
    @InjectRepository(KBSource)
    private readonly kbSourceRepository: Repository<KBSource>,
    private readonly configService: ConfigService,
    private readonly botsService: BotsService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.kbChunkRepository.query(
        'CREATE EXTENSION IF NOT EXISTS vector',
      );
      this.vectorEnabled = true;
    } catch (err) {
      this.logger.warn(
        'Could not ensure pgvector extension. Retrieval may fail until extension exists.',
        err instanceof Error ? err.message : String(err),
      );
      this.vectorEnabled = false;
    }
  }

  async retrieveContext(botId: string, query: string): Promise<string> {
    const startedAt = Date.now();
    const trimmed = query.trim();
    if (!trimmed) return '';
    if (!this.vectorEnabled) return '';

    let rows: Array<{ content: string; score: string | number }> = [];
    try {
      const widgetCtx: RequestContext = createInternalContext(
        RequestContextId.KB_RETRIEVAL_BOT,
      );
      const bot = await this.botsService.findOne(widgetCtx, botId, {
        forWidget: true,
        relations: ['kbSources'],
      });
      const sourceIds = (bot.kbSources || []).map((s) => s.id);
      if (sourceIds.length === 0) {
        this.logger.log(
          `KB retrieval skipped: no linked sources (botId=${botId})`,
        );
        return '';
      }
      const queryEmbedding = await this.createEmbedding(trimmed);
      const vectorLiteral = this.toVectorLiteral(queryEmbedding);
      const topK = 5;
      rows = (await this.kbChunkRepository.query(
        `SELECT c.content, (1 - (c.embedding <=> $1::vector)) AS score
         FROM kb_chunks c
         INNER JOIN kb_sources s ON s.id = c.kb_source_id
         WHERE c.kb_source_id = ANY($2::uuid[])
           AND s.status = $3
         ORDER BY c.embedding <=> $1::vector
         LIMIT $4`,
        [vectorLiteral, sourceIds, SourceStatus.READY, topK],
      )) as Array<{ content: string; score: string | number }>;
    } catch (err) {
      this.logger.warn(
        `Vector retrieval unavailable for botId=${botId}; answering without KB context.`,
        err instanceof Error ? err.message : String(err),
      );
      return '';
    }

    const usable = rows
      .map<RetrievedChunk>((r) => ({
        content: r.content,
        score: typeof r.score === 'string' ? Number(r.score) : r.score,
      }))
      .filter((r) => Number.isFinite(r.score) && r.score > 0.45);

    if (usable.length === 0) {
      this.logger.log(
        `KB retrieval returned no usable context (botId=${botId}, candidates=${rows.length}, elapsedMs=${Date.now() - startedAt})`,
      );
      return '';
    }
    this.logger.log(
      `KB retrieval succeeded (botId=${botId}, candidates=${rows.length}, usable=${usable.length}, elapsedMs=${Date.now() - startedAt})`,
    );
    return usable
      .map((r, i) => `Context ${i + 1}:\n${r.content}`)
      .join('\n\n');
  }

  enqueueIndexForSource(ctx: RequestContext, source: KBSource): void {
    const auditCtx = createInternalContext(RequestContextId.KB_INDEXING);
    void this.auditService
      .log(auditCtx, {
        action: 'KB_INDEXING_QUEUED',
        resource: 'kb-source',
        resourceId: source.id,
        details: {
          sourceType: source.sourceType,
          organizationId: source.organizationId,
        },
      })
      .catch(() => {});
    this.logger.log(
      `KB indexing queued (sourceId=${source.id}, sourceType=${source.sourceType})`,
    );
    void this.indexSource(ctx, source).catch((err) => {
      void this.kbSourceRepository
        .update({ id: source.id }, { status: SourceStatus.FAILED })
        .catch(() => undefined);
      void this.auditService
        .log(auditCtx, {
          action: 'KB_INDEXING_FAILED',
          resource: 'kb-source',
          resourceId: source.id,
          details: {
            sourceType: source.sourceType,
            organizationId: source.organizationId,
            error: err instanceof Error ? err.message : String(err),
          },
        })
        .catch(() => {});
      this.logger.warn(
        `Background KB indexing failed (sourceId=${source.id}, sourceType=${source.sourceType})`,
        err instanceof Error ? err.message : String(err),
      );
    });
  }

  private async indexSource(
    ctx: RequestContext,
    source: KBSource,
  ): Promise<void> {
    void ctx;
    const startedAt = Date.now();
    if (!this.vectorEnabled) {
      throw new Error('Vector extension is not enabled');
    }
    await this.kbSourceRepository.update(
      { id: source.id },
      { status: SourceStatus.PROCESSING },
    );
    const text = await this.extractSourceText(source);
    if (!text) {
      throw new Error('No extractable text found for indexing');
    }

    await this.kbChunkRepository.delete({ kbSourceId: source.id });
    const chunks = this.chunkText(text);
    const toSave: KBChunk[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const embedding = await this.createEmbedding(chunks[i]);
      toSave.push(
        this.kbChunkRepository.create({
          kbSourceId: source.id,
          chunkIndex: i,
          content: chunks[i],
          embedding: this.toVectorLiteral(embedding),
        }),
      );
    }
    if (toSave.length > 0) {
      await this.kbChunkRepository.save(toSave);
      await this.kbSourceRepository.update(
        { id: source.id },
        { status: SourceStatus.READY, lastRefreshed: new Date() },
      );
      const auditCtx = createInternalContext(RequestContextId.KB_INDEXING);
      void this.auditService
        .log(auditCtx, {
          action: 'KB_INDEXING_SUCCEEDED',
          resource: 'kb-source',
          resourceId: source.id,
          details: {
            sourceType: source.sourceType,
            organizationId: source.organizationId,
            chunks: toSave.length,
            elapsedMs: Date.now() - startedAt,
          },
        })
        .catch(() => {});
      this.logger.log(
        `KB indexing completed (sourceId=${source.id}, sourceType=${source.sourceType}, chunks=${toSave.length}, elapsedMs=${Date.now() - startedAt})`,
      );
      return;
    }
    throw new Error('No chunks generated for indexing');
  }

  private async extractSourceText(source: KBSource): Promise<string> {
    if (source.sourceType === SourceType.TXT) {
      return (source.sourceValue || '').trim();
    }
    if (source.sourceType === SourceType.PDF) {
      return this.extractPdfText(source.sourceValue);
    }
    if (source.sourceType === SourceType.DOCX) {
      return this.extractDocxText(source.sourceValue);
    }
    return '';
  }

  private async extractPdfText(sourceValue: string): Promise<string> {
    const buffer = await this.loadSourceBinary(sourceValue);
    if (!buffer || buffer.length === 0) return '';
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    return (parsed.text || '').replace(/\s+/g, ' ').trim();
  }

  private async extractDocxText(sourceValue: string): Promise<string> {
    const buffer = await this.loadSourceBinary(sourceValue);
    if (!buffer || buffer.length === 0) return '';
    const parsed = await mammoth.extractRawText({ buffer });
    return (parsed.value || '').replace(/\s+/g, ' ').trim();
  }

  private async loadSourceBinary(sourceValue: string): Promise<Buffer> {
    if (this.storageService.isKbSourceS3Key(sourceValue)) {
      const { stream } = await this.storageService.getKbSourceFileStream(sourceValue);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    const localPath = getAbsolutePathForDownload(sourceValue);
    if (!localPath) {
      return Buffer.alloc(0);
    }
    return readFile(localPath);
  }

  private chunkText(input: string, size = 140, overlap = 30): string[] {
    if (!input || !input.trim()) return [];
  
    input = input.replace(/\s+/g, ' ').trim();
  
    const sentences = input.split(/(?<=[.?!])\s+/);
  
    const chunks: string[] = [];
    let currentWords: string[] = [];
  
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      if (currentWords.length + words.length <= size) {
        currentWords.push(...words);
      } else {
        if (currentWords.length) {
          chunks.push(currentWords.join(' ').trim());
        }
  
        const overlapWords = currentWords.slice(-overlap);
        currentWords = [...overlapWords, ...words];
  
        while (currentWords.length > size) {
          const slice = currentWords.slice(0, size);
          chunks.push(slice.join(' ').trim());
          currentWords = currentWords.slice(size - overlap);
        }
      }
    }
  
    if (currentWords.length) {
      chunks.push(currentWords.join(' ').trim());
    }
  
    return chunks;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const apiKey = this.getRequiredEnv('OPENAI_API_KEY');
    const model = this.getRequiredEnv('OPENAI_EMBEDDING_MODEL');
    const baseUrl = this.getRequiredEnv('OPENAI_BASE_URL').replace(/\/+$/, '');
    const apiVersion = this.getRequiredEnv('OPENAI_API_VERSION');

    const response = await axios.post<{
      data?: Array<{ embedding?: number[] }>;
    }>(
      `${baseUrl}/embeddings?api-version=${encodeURIComponent(apiVersion)}`,
      {
        model,
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const data = response.data;
    const embedding = data?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('OpenAI embeddings returned empty vector');
    }
    return embedding;
  }

  private toVectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
  }

  private getRequiredEnv(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value || !value.trim()) {
      throw new Error(`${name} is missing`);
    }
    return value.trim();
  }
}
