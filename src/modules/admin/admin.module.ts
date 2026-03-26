import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { BotModule } from '../bot/bot.module';
import { ConversationModule } from '../conversation/conversation.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [UserModule, BotModule, ConversationModule, KnowledgeBaseModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
