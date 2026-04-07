import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { KbRetrievalModule } from '../kb-retrieval/kb-retrieval.module';
import { TokenTransactionModule } from '../token-transaction/token-transaction.module';
import { OpenAiBotReplyListener } from './openai-bot-reply.listener';
import { OpenAiService } from './openai.service';
import { OpenAiController } from './openai.controller';

@Module({
  imports: [ConversationModule, KbRetrievalModule, TokenTransactionModule],
  controllers: [OpenAiController],
  providers: [OpenAiService, OpenAiBotReplyListener],
  exports: [OpenAiService],
})
export class OpenAiModule {}
