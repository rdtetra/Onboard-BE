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
import { WidgetAuthContextDecorator } from '../../common/decorators/widget-auth-context.decorator';
import type { WidgetAuthContext } from '../../types/widget-auth';
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
    @WidgetAuthContextDecorator() widgetAuthContext: WidgetAuthContext,
    @Body() dto: CreateWidgetConversationDto,
  ) {
    return this.embedService.createConversation(widgetAuthContext, dto);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @WidgetAuthContextDecorator() widgetAuthContext: WidgetAuthContext,
    @Param('id') id: string,
  ) {
    return this.embedService.getMessages(widgetAuthContext, id);
  }

  @Post('conversations/:id/messages')
  addMessage(
    @WidgetAuthContextDecorator() widgetAuthContext: WidgetAuthContext,
    @Param('id') id: string,
    @Body() dto: AddWidgetMessageDto,
  ) {
    return this.embedService.addMessage(widgetAuthContext, id, dto);
  }

  @Post('conversations/:id/end')
  endConversation(
    @WidgetAuthContextDecorator() widgetAuthContext: WidgetAuthContext,
    @Param('id') id: string,
  ) {
    return this.embedService.endConversation(widgetAuthContext, id);
  }
}
