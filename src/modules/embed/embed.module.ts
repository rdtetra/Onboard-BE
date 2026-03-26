import { Module } from '@nestjs/common';
import { EmbedController } from './embed.controller';
import { EmbedService } from './embed.service';
import { ConversationModule } from '../conversation/conversation.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetAuthGuard } from '../../common/guards/widget-auth.guard';
import { BotModule } from '../bot/bot.module';
import { WidgetModule } from '../widget/widget.module';

@Module({
  imports: [
    BotModule,
    WidgetModule,
    ConversationModule,
    JwtWrapperModule,
  ],
  controllers: [EmbedController],
  providers: [EmbedService, WidgetAuthGuard],
})
export class EmbedModule {}
