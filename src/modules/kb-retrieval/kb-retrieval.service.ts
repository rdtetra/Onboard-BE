import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFile } from 'fs/promises';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { KBChunk } from '../../common/entities/kb-chunk.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { SourceStatus, SourceType } from '../../common/enums/knowledge-base.enum';
import { BotService } from '../bot/bot.service';
import { RequestContextId } from '../../common/enums/request-context.enum';
import type { RequestContext } from '../../types/request';
import { createInternalContext } from '../../common/utils/request-context.util';
import { getRequiredEnv } from '../../common/utils/env.util';
import { StorageService } from '../storage/storage.service';
import { getAbsolutePathForDownload } from '../knowledge-base/multer-options';
import { AuditService } from '../audit/audit.service';

/** One chunk from vector search, with cosine-style similarity (higher = closer match). */
type VectorRetrievedChunk = {
  content: string;
  score: number;
  /** KB source display name (for multi-source bots). */
  sourceName: string;
};

@Injectable()
export class KbRetrievalService implements OnModuleInit {
  private readonly logger = new Logger(KbRetrievalService.name);
  private vectorEnabled = false;

  /** Tail of long chat-derived queries sent to the rewriter (chars). */
  private static readonly RETRIEVAL_REWRITE_MAX_INPUT_CHARS = 4000;
  private static readonly RETRIEVAL_REWRITE_MAX_OUTPUT_CHARS = 2000;
  private static readonly RETRIEVAL_REWRITE_SYSTEM =
    'You rewrite user text into a dense search query for semantic (vector) retrieval over a knowledge base.\n' +
    'Expand with synonyms, related concepts, entities, and phrases likely to appear in docs.\n' +
    'Prefer a single flowing phrase or a short comma-separated list of key terms—not bullet points.\n' +
    'Output only the search query text: no quotes, labels, markdown, or explanation.\n' +
    'If the input is already specific, enrich lightly without changing meaning.';

  private static readonly RETRIEVAL_VECTOR_TOP_K = 15;
  /** Target words per stored KB chunk (~300–500). */
  private static readonly RETRIEVAL_CHUNK_SIZE_WORDS = 400;
  /** Word overlap between consecutive chunks (~50–80). */
  private static readonly RETRIEVAL_CHUNK_OVERLAP_WORDS = 65;
  /** Chunks passed to the answer LLM after re-ranking (target range 4–6). */
  private static readonly RETRIEVAL_RERANK_KEEP = 5;
  private static readonly RETRIEVAL_RERANK_MAX_CHUNK_CHARS = 1400;
  private static readonly RETRIEVAL_RERANK_QUERY_MAX_CHARS = 4000;
  private static readonly RETRIEVAL_RERANK_SYSTEM =
    'You rank knowledge base passages by usefulness for answering the user question.\n' +
    'Passages may come from different sources (see source labels); prefer the best on-topic content regardless of source.\n' +
    'Passages are numbered starting at 1.\n' +
    'Reply with ONLY a JSON array of integers: passage numbers in best-first order.\n' +
    'Include at most the number of indices requested; omit passages that are irrelevant or redundant.\n' +
    'If nothing is useful, reply with an empty array [].\n' +
    'No markdown fences, labels, or explanation—only the JSON array.';

  /** pgvector cosine distance → similarity; normalize for storage/display. */
  private static parseVectorSimilarityScore(raw: string | number): number {
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isFinite(n)) {
      return 0;
    }
    return Math.max(0, Math.min(1, n));
  }

  private static formatSimilarityForPrompt(score: number): string {
    if (!Number.isFinite(score)) {
      return '0.00';
    }
    return Math.max(0, Math.min(1, score)).toFixed(2);
  }

  /** Safe one-line label for prompts (avoid breaking `|` headers). */
  private static sanitizeSourceLabel(name: string): string {
    const t = (name || '').trim().replace(/\|/g, '/').replace(/\s+/g, ' ');
    return t.length > 0 ? t.slice(0, 120) : 'Unknown source';
  }

  private static formatPassageHeader(
    index: number,
    score: number,
    sourceName: string,
  ): string {
    const src = KbRetrievalService.sanitizeSourceLabel(sourceName);
    return `[Passage ${index} | score: ${KbRetrievalService.formatSimilarityForPrompt(score)} | source: ${src}]`;
  }

  /** At least 1 chunk per source in the candidate pool; then global top-K by score. */
  private static perSourceChunkCap(sourceCount: number, topK: number): number {
    const n = Math.max(1, sourceCount);
    return Math.max(1, Math.ceil(topK / n));
  }

  constructor(
    @InjectRepository(KBChunk)
    private readonly kbChunkRepository: Repository<KBChunk>,
    @InjectRepository(KBSource)
    private readonly kbSourceRepository: Repository<KBSource>,
    private readonly configService: ConfigService,
    private readonly botsService: BotService,
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
    const trimmed = query.trim();
    if (!trimmed) return '';
    if (!this.vectorEnabled) return '';

    let sourceIds: string[] = [];
    try {
      const widgetCtx: RequestContext = createInternalContext(
        RequestContextId.KB_RETRIEVAL_BOT,
      );
      const bot = await this.botsService.findOne(widgetCtx, botId, {
        forWidget: true,
        relations: ['kbSources'],
      });
      sourceIds = (bot.kbSources || []).map((s) => s.id);
    } catch (err) {
      this.logger.warn(
        `Vector retrieval unavailable for botId=${botId}; answering without KB context.`,
        err instanceof Error ? err.message : String(err),
      );
      return '';
    }

    if (sourceIds.length === 0) {
      return '';
    }

    const uniqueSourceIds = [...new Set(sourceIds)];

    const retrievalRewriteModel = getRequiredEnv(
      this.configService,
      'OPENAI_RETRIEVAL_REWRITE_MODEL',
    );

    let rows: VectorRetrievedChunk[] = [];
    try {
      const queryForEmbedding = await this.rewriteQueryForEmbedding(
        trimmed,
        retrievalRewriteModel,
      );
      const queryEmbedding = await this.createEmbedding(queryForEmbedding);
      const vectorLiteral = this.toVectorLiteral(queryEmbedding);
      const topK = KbRetrievalService.RETRIEVAL_VECTOR_TOP_K;
      const perSourceCap = KbRetrievalService.perSourceChunkCap(
        uniqueSourceIds.length,
        topK,
      );
      const rawRows = (await this.kbChunkRepository.query(
        `SELECT sub.content, sub.score, sub.source_name
         FROM (
           SELECT c.content,
                  (1 - (c.embedding <=> $1::vector)) AS score,
                  s.name AS source_name,
                  ROW_NUMBER() OVER (
                    PARTITION BY c.kb_source_id
                    ORDER BY c.embedding <=> $1::vector
                  ) AS rn
           FROM kb_chunks c
           INNER JOIN kb_sources s ON s.id = c.kb_source_id
           WHERE c.kb_source_id = ANY($2::uuid[])
             AND s.status = $3
         ) sub
         WHERE sub.rn <= $4
         ORDER BY sub.score DESC
         LIMIT $5`,
        [
          vectorLiteral,
          uniqueSourceIds,
          SourceStatus.READY,
          perSourceCap,
          topK,
        ],
      )) as Array<{
        content: string;
        score: string | number;
        source_name: string | null;
      }>;
      rows = rawRows.map((r) => ({
        content: r.content,
        score: KbRetrievalService.parseVectorSimilarityScore(r.score),
        sourceName: (r.source_name ?? '').trim(),
      }));
    } catch (err) {
      this.logger.warn(
        `Vector retrieval unavailable for botId=${botId}; answering without KB context.`,
        err instanceof Error ? err.message : String(err),
      );
      return '';
    }

    if (rows.length === 0) return '';

    const keep = KbRetrievalService.RETRIEVAL_RERANK_KEEP;
    const afterRerank = await this.rerankRetrievalChunks(
      trimmed,
      rows,
      retrievalRewriteModel,
      keep,
    );
    const finalRows: VectorRetrievedChunk[] =
      afterRerank.length > 0
        ? afterRerank
        : rows.slice(0, Math.min(keep, rows.length));

    return finalRows
      .map(
        (r, i) =>
          `${KbRetrievalService.formatPassageHeader(i + 1, r.score, r.sourceName)}\n${r.content}`,
      )
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
    if (source.sourceType === SourceType.URL) {
      return this.extractUrlText(source.sourceValue);
    }
    if (source.sourceType === SourceType.PDF) {
      return this.extractPdfText(source.sourceValue);
    }
    if (source.sourceType === SourceType.DOCX) {
      return this.extractDocxText(source.sourceValue);
    }
    return '';
  }

  private async extractUrlText(sourceValue: string): Promise<string> {
    const url = (sourceValue || '').trim();
    if (!url) return '';

    const response = await axios.get<string>(url, {
      timeout: 10000,
      responseType: 'text',
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        'User-Agent': 'Onboard-KB-Indexer/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const html = response.data || '';
    if (!html.trim()) return '';

    const $ = cheerio.load(html);
    $(
      'script, style, noscript, svg, iframe, canvas, template, meta, link, head, nav, header, footer, aside',
    ).remove();

    const bodyText = $('body').text() || $.root().text();
    return this.normalizeExtractedText(bodyText);
  }

  private async extractPdfText(sourceValue: string): Promise<string> {
    const buffer = await this.loadSourceBinary(sourceValue);
    if (!buffer || buffer.length === 0) return '';
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    return this.normalizeExtractedText(parsed.text || '');
  }

  private async extractDocxText(sourceValue: string): Promise<string> {
    const buffer = await this.loadSourceBinary(sourceValue);
    if (!buffer || buffer.length === 0) return '';
    const parsed = await mammoth.extractRawText({ buffer });
    return this.normalizeExtractedText(parsed.value || '');
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

  private chunkText(input: string): string[] {
    if (!input || !input.trim()) return [];

    const size = KbRetrievalService.RETRIEVAL_CHUNK_SIZE_WORDS;
    const overlap = KbRetrievalService.RETRIEVAL_CHUNK_OVERLAP_WORDS;
    if (overlap >= size) {
      throw new Error(
        'RETRIEVAL_CHUNK_OVERLAP_WORDS must be less than RETRIEVAL_CHUNK_SIZE_WORDS',
      );
    }

    let normalized = input.replace(/\s+/g, ' ').trim();

    const sentences = normalized.split(/(?<=[.?!])\s+/);

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

  private normalizeExtractedText(input: string): string {
    return (input || '')
      .replace(/\r/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Expands short or vague user wording into retrieval-friendly text before embedding.
   * On API failure, returns the original query (trimmed).
   */
  private async rewriteQueryForEmbedding(
    query: string,
    rewriteModel: string,
  ): Promise<string> {
    const trimmed = query.trim();
    if (!trimmed) return trimmed;

    const maxIn = KbRetrievalService.RETRIEVAL_REWRITE_MAX_INPUT_CHARS;
    const forModel =
      trimmed.length > maxIn ? trimmed.slice(-maxIn) : trimmed;

    try {
      const apiKey = getRequiredEnv(this.configService, 'OPENAI_API_KEY');
      const baseUrl = getRequiredEnv(this.configService, 'OPENAI_BASE_URL').replace(
        /\/+$/,
        '',
      );
      const apiVersion = getRequiredEnv(this.configService, 'OPENAI_API_VERSION');

      const response = await axios.post<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>(
        `${baseUrl}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
        {
          model: rewriteModel,
          messages: [
            {
              role: 'system',
              content: KbRetrievalService.RETRIEVAL_REWRITE_SYSTEM,
            },
            { role: 'user', content: forModel },
          ],
          temperature: 0.2,
          max_tokens: 256,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const raw = response.data?.choices?.[0]?.message?.content?.trim() ?? '';
      const collapsed = raw.replace(/\s+/g, ' ').trim();
      if (!collapsed) {
        return trimmed;
      }
      const maxOut = KbRetrievalService.RETRIEVAL_REWRITE_MAX_OUTPUT_CHARS;
      return collapsed.length > maxOut ? collapsed.slice(0, maxOut) : collapsed;
    } catch (err) {
      this.logger.debug(
        `Retrieval query rewrite skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
      return trimmed;
    }
  }

  /**
   * Cross-checks vector candidates with a chat model; returns best-first subset.
   * On failure or empty parse, returns [] so caller can fall back to vector order.
   */
  private async rerankRetrievalChunks(
    userQuery: string,
    candidates: VectorRetrievedChunk[],
    model: string,
    keep: number,
  ): Promise<VectorRetrievedChunk[]> {
    if (candidates.length === 0) return [];
    if (candidates.length === 1) return [candidates[0]];

    const maxQ = KbRetrievalService.RETRIEVAL_RERANK_QUERY_MAX_CHARS;
    const q = userQuery.length > maxQ ? userQuery.slice(-maxQ) : userQuery;

    const maxC = KbRetrievalService.RETRIEVAL_RERANK_MAX_CHUNK_CHARS;
    const numbered = candidates
      .map((row, i) => {
        const c = row.content;
        const body = c.length > maxC ? `${c.slice(0, maxC)}…` : c;
        const sc = KbRetrievalService.formatSimilarityForPrompt(row.score);
        const src = KbRetrievalService.sanitizeSourceLabel(row.sourceName);
        return `### ${i + 1} | score: ${sc} | source: ${src}\n${body}`;
      })
      .join('\n\n');

    const userPayload =
      `User question:\n${q}\n\n` +
      `Return at most ${keep} passage numbers (1-based), best first, as a JSON array only.\n\n` +
      `Passages:\n${numbered}`;

    try {
      const apiKey = getRequiredEnv(this.configService, 'OPENAI_API_KEY');
      const baseUrl = getRequiredEnv(this.configService, 'OPENAI_BASE_URL').replace(
        /\/+$/,
        '',
      );
      const apiVersion = getRequiredEnv(this.configService, 'OPENAI_API_VERSION');

      const response = await axios.post<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>(
        `${baseUrl}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
        {
          model,
          messages: [
            {
              role: 'system',
              content: KbRetrievalService.RETRIEVAL_RERANK_SYSTEM,
            },
            { role: 'user', content: userPayload },
          ],
          temperature: 0,
          max_tokens: 128,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const raw =
        response.data?.choices?.[0]?.message?.content?.trim() ?? '';
      const indices = this.parseRerankIndicesFromModel(
        raw,
        candidates.length,
        keep,
      );
      if (indices.length === 0) {
        return [];
      }
      return indices
        .map((i) => candidates[i - 1])
        .filter(
          (row): row is VectorRetrievedChunk =>
            row != null &&
            typeof row.content === 'string' &&
            row.content.length > 0,
        );
    } catch (err) {
      this.logger.debug(
        `Retrieval re-rank skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  private parseRerankIndicesFromModel(
    raw: string,
    maxIndex: number,
    keep: number,
  ): number[] {
    const stripped = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const match = stripped.match(/\[[\s\d,]*\d+\s*\]/);
      if (!match) {
        return [];
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const out: number[] = [];
    const seen = new Set<number>();
    for (const item of parsed) {
      const n =
        typeof item === 'number' && Number.isInteger(item)
          ? item
          : parseInt(String(item).trim(), 10);
      if (
        !Number.isFinite(n) ||
        n < 1 ||
        n > maxIndex ||
        seen.has(n)
      ) {
        continue;
      }
      seen.add(n);
      out.push(n);
      if (out.length >= keep) {
        break;
      }
    }
    return out;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const apiKey = getRequiredEnv(this.configService, 'OPENAI_API_KEY');
    const model = getRequiredEnv(this.configService, 'OPENAI_EMBEDDING_MODEL');
    const baseUrl = getRequiredEnv(this.configService, 'OPENAI_BASE_URL').replace(
      /\/+$/,
      '',
    );
    const apiVersion = getRequiredEnv(this.configService, 'OPENAI_API_VERSION');

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
}
