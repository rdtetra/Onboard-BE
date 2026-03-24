import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KBSource } from '../../common/entities/kb-source.entity';
import { BotKbLinkModule } from '../bot-kb-link/bot-kb-link.module';
import { KbRetrievalModule } from '../kb-retrieval/kb-retrieval.module';
import { StorageModule } from '../storage/storage.module';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KBSource]),
    BotKbLinkModule,
    KbRetrievalModule,
    StorageModule,
  ],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class KnowledgeBaseModule {}
