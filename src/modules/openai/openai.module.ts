import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { KbRetrievalModule } from '../kb-retrieval/kb-retrieval.module';
import { OpenAiService } from './openai.service';

@Module({
  imports: [ConversationModule, KbRetrievalModule],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
