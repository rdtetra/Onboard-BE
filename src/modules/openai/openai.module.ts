import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { KbRetrievalModule } from '../kb-retrieval/kb-retrieval.module';
import { OpenAiService } from './openai.service';

@Module({
  imports: [ConversationsModule, KbRetrievalModule],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
