import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { KbRetrievalModule } from '../kb-retrieval/kb-retrieval.module';
import { TokenTransactionModule } from '../token-transaction/token-transaction.module';
import { OpenAiService } from './openai.service';
import { OpenAiController } from './openai.controller';

@Module({
  imports: [ConversationModule, KbRetrievalModule, TokenTransactionModule],
  controllers: [OpenAiController],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
