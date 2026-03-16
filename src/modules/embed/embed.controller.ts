import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { EmbedService } from './embed.service';
import { CreateWidgetConversationDto } from './dto/create-widget-conversation.dto';
import { AddWidgetMessageDto } from './dto/add-widget-message.dto';

@Controller('embed')
@Public()
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}

  @Get('embed.js')
  serveScript(@Res() res: Response): void {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(this.embedService.getScript());
  }

  @Post('conversations')
  createConversation(@Body() dto: CreateWidgetConversationDto) {
    return this.embedService.createConversation(dto);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('visitorId') visitorId: string,
  ) {
    return this.embedService.getMessages(id, visitorId);
  }

  @Post('conversations/:id/messages')
  addMessage(@Param('id') id: string, @Body() dto: AddWidgetMessageDto) {
    return this.embedService.addMessage(id, dto);
  }

  @Post('conversations/:id/end')
  endConversation(
    @Param('id') id: string,
    @Body('visitorId') visitorId: string,
  ) {
    return this.embedService.endConversation(id, visitorId);
  }
}
