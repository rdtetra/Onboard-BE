import { Module } from '@nestjs/common';
import { EmbedController } from './embed.controller';
import { EmbedService } from './embed.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetAuthGuard } from '../../common/guards/widget-auth.guard';

@Module({
  imports: [ConversationsModule, JwtWrapperModule],
  controllers: [EmbedController],
  providers: [EmbedService, WidgetAuthGuard],
})
export class EmbedModule {}
