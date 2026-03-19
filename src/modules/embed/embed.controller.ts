import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WidgetAuthGuard } from '../../common/guards/widget-auth.guard';
import { WidgetAuthContext } from '../../common/decorators/widget-auth-context.decorator';
import type { WidgetAuthContext as WidgetAuthContextType } from '../../types/widget-auth';
import { EmbedService } from './embed.service';
import { CreateWidgetConversationDto } from './dto/create-widget-conversation.dto';
import { AddWidgetMessageDto } from './dto/add-widget-message.dto';

@Controller('embed')
@Public()
@UseGuards(WidgetAuthGuard)
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}

  @Get('embed.js')
  serveScript(@Res() res: Response): void {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(this.embedService.getScript());
  }

  @Post('conversations')
  createConversation(
    @WidgetAuthContext() widgetAuthContext: WidgetAuthContextType,
    @Body() dto: CreateWidgetConversationDto,
  ) {
    return this.embedService.createConversation(widgetAuthContext, dto);
  }

  @Get('config')
  getBotConfig(
    @WidgetAuthContext() widgetAuthContext: WidgetAuthContextType,
  ) {
    return this.embedService.getBotConfig(widgetAuthContext);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @WidgetAuthContext() widgetAuthContext: WidgetAuthContextType,
    @Param('id') id: string,
  ) {
    return this.embedService.getMessages(widgetAuthContext, id);
  }

  @Post('conversations/:id/messages')
  addMessage(
    @WidgetAuthContext() widgetAuthContext: WidgetAuthContextType,
    @Param('id') id: string,
    @Body() dto: AddWidgetMessageDto,
  ) {
    return this.embedService.addMessage(widgetAuthContext, id, dto);
  }

  @Post('conversations/:id/end')
  endConversation(
    @WidgetAuthContext() widgetAuthContext: WidgetAuthContextType,
    @Param('id') id: string,
  ) {
    return this.embedService.endConversation(widgetAuthContext, id);
  }
}
