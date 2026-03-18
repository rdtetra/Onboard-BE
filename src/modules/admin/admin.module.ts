import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BotsModule } from '../bots/bots.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, BotsModule, ConversationsModule, KnowledgeBaseModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
