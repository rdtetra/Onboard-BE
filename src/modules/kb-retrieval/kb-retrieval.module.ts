import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KBChunk } from '../../common/entities/kb-chunk.entity';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotModule } from '../bot/bot.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { KbRetrievalService } from './kb-retrieval.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KBChunk, KBSource]),
    BotModule,
    AuditModule,
    StorageModule,
  ],
  providers: [KbRetrievalService],
  exports: [KbRetrievalService],
})
export class KbRetrievalModule {}
