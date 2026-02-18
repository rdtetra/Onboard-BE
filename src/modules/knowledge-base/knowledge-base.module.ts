import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KBSource } from '../../common/entities/kb-source.entity';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KBSource])],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class KnowledgeBaseModule {}
