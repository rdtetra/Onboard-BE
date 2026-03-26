import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { KBSource } from './kb-source.entity';

@Entity('kb_chunks')
@Index('idx_kb_chunks_source_id', ['kbSourceId'])
@Unique('uq_kb_chunks_source_chunk', ['kbSourceId', 'chunkIndex'])
export class KBChunk extends BaseEntity {
  @Column({ type: 'uuid', name: 'kb_source_id' })
  kbSourceId: string;

  @ManyToOne(() => KBSource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kb_source_id' })
  kbSource: KBSource;

  @Column({ type: 'int', name: 'chunk_index' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'vector', name: 'embedding', nullable: false })
  embedding: string;
}
