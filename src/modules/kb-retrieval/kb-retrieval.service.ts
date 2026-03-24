import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KBChunk } from '../../common/entities/kb-chunk.entity';
import { SourceType } from '../../types/knowledge-base';
import type { RetrievedChunk } from '../../types/kb-retrieval';
import { BotsService } from '../bots/bots.service';
import type { RequestContext } from '../../types/request';
import type { KBSource } from '../../common/entities/kb-source.entity';

@Injectable()
export class KbRetrievalService implements OnModuleInit {
  private readonly logger = new Logger(KbRetrievalService.name);
  private vectorEnabled = false;

  constructor(
    @InjectRepository(KBChunk)
    private readonly kbChunkRepository: Repository<KBChunk>,
    private readonly configService: ConfigService,
    private readonly botsService: BotsService,
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

    let rows: Array<{ content: string; score: string | number }> = [];
    try {
      const widgetCtx: RequestContext = {
        user: null,
        url: '/system/kb-retrieval',
        method: 'SYSTEM',
        timestamp: new Date().toISOString(),
        requestId: 'kb-retrieval-bot',
      };
      const bot = await this.botsService.findOne(widgetCtx, botId, {
        forWidget: true,
        relations: ['kbSources'],
      });
      const sourceIds = (bot.kbSources || []).map((s) => s.id);
      if (sourceIds.length === 0) return '';
      const queryEmbedding = await this.createEmbedding(trimmed);
      const vectorLiteral = this.toVectorLiteral(queryEmbedding);
      const topK = 5;
      rows = (await this.kbChunkRepository.query(
        `SELECT content, (1 - (embedding::vector <=> $1::vector)) AS score
         FROM kb_chunks
         WHERE kb_source_id = ANY($2::uuid[])
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $3`,
        [vectorLiteral, sourceIds, topK],
      )) as Array<{ content: string; score: string | number }>;
    } catch (err) {
      this.logger.warn(
        'Vector retrieval unavailable; answering without KB context.',
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

    if (usable.length === 0) return '';
    return usable
      .map((r, i) => `Context ${i + 1}:\n${r.content}`)
      .join('\n\n');
  }

  enqueueIndexForSource(ctx: RequestContext, source: KBSource): void {
    void this.indexSource(ctx, source).catch((err) => {
      this.logger.warn(
        `Background KB indexing failed for source=${source.id}`,
        err instanceof Error ? err.message : String(err),
      );
    });
  }

  private async indexSource(
    ctx: RequestContext,
    source: KBSource,
  ): Promise<void> {
    void ctx;
    if (!this.vectorEnabled) return;
    if (source.sourceType !== SourceType.TXT) return;
    const text = (source.sourceValue || '').trim();
    if (!text) return;

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
    }
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
