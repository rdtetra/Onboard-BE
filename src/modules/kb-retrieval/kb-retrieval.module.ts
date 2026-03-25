import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KBChunk } from '../../common/entities/kb-chunk.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotsModule } from '../bots/bots.module';
import { StorageModule } from '../storage/storage.module';
import { KbRetrievalService } from './kb-retrieval.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KBChunk, KBSource]),
    BotsModule,
    StorageModule,
  ],
  providers: [KbRetrievalService],
  exports: [KbRetrievalService],
})
export class KbRetrievalModule {}
