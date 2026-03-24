import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KBChunk } from '../../common/entities/kb-chunk.entity';
import { BotsModule } from '../bots/bots.module';
import { KbRetrievalService } from './kb-retrieval.service';

@Module({
  imports: [TypeOrmModule.forFeature([KBChunk]), BotsModule],
  providers: [KbRetrievalService],
  exports: [KbRetrievalService],
})
export class KbRetrievalModule {}
