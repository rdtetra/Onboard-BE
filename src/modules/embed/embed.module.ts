import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbedController } from './embed.controller';
import { EmbedService } from './embed.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { WidgetAuthGuard } from '../../common/guards/widget-auth.guard';
import { Bot } from '../../common/entities/bot.entity';
import { WidgetsModule } from '../widgets/widgets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bot]),
    WidgetsModule,
    ConversationsModule,
    JwtWrapperModule,
  ],
  controllers: [EmbedController],
  providers: [EmbedService, WidgetAuthGuard],
})
export class EmbedModule {}
