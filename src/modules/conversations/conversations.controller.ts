import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @Allow(Permission.READ_BOT)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateConversationDto,
  ): Promise<Conversation> {
    return this.conversationsService.create(ctx, dto.botId, dto.visitorId);
  }

  @Get()
  @Allow(Permission.READ_BOT)
  findAll(
    @RequestContext() ctx: RequestContextType,
    @Query() query: GetConversationsQueryDto,
  ): Promise<PaginatedResult<Conversation>> {
    return this.conversationsService.findAll(
      ctx,
      { page: query.page, limit: query.limit },
      {
        botId: query.botId,
        visitorId: query.visitorId,
        status: query.status,
        search: query.search,
        date: query.date,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
    );
  }

  @Get(':id')
  @Allow(Permission.READ_BOT)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Conversation> {
    return this.conversationsService.findOne(ctx, id);
  }

  @Post(':id/messages')
  @Allow(Permission.READ_BOT)
  addMessage(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ): Promise<Message> {
    return this.conversationsService.addMessage(ctx, id, dto);
  }
}
