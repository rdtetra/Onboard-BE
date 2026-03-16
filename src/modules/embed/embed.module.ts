import { Module } from '@nestjs/common';
import { EmbedController } from './embed.controller';
import { EmbedService } from './embed.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { JwtWrapperModule } from '../jwt/jwt.module';

@Module({
  imports: [ConversationsModule, JwtWrapperModule],
  controllers: [EmbedController],
  providers: [EmbedService],
})
export class EmbedModule {}
