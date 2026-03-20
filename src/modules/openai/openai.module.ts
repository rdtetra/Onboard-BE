import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { OpenAiService } from './openai.service';

@Module({
  imports: [ConversationsModule],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
