import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConversationService } from '../conversation/conversation.service';
import { WidgetService } from '../widget/widget.service';
import { BotService } from '../bot/bot.service';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { MessageSender } from '../../common/enums/message.enum';
import { RequestContextId } from '../../common/enums/request-context.enum';
import type { EmbedPageContext } from '../../types/embed';
import type { RequestContext } from '../../types/request';
import type { WidgetAuthContext } from '../../types/widget-auth';
import { EMBED_SCRIPT } from './embed.script';
import { CreateWidgetConversationDto } from './dto/create-widget-conversation.dto';
import { AddWidgetMessageDto } from './dto/add-widget-message.dto';
import type { BotConfigResponseDto } from './dto/bot-config.response';
import { DEFAULT_WIDGET_CONFIG } from '../../common/constants/widget-config';
import { WidgetAppearance } from '../../common/enums/widget.enum';
import { createInternalContext } from '../../common/utils/request-context.util';
import { TaskService } from '../task/task.service';
import { BotType } from '../../common/enums/bot.enum';
import type { Bot } from '../../common/entities/bot.entity';
import { pickChildBotForEmbedContext } from '../../utils/embed-origin.util';

const widgetCtx: RequestContext = createInternalContext(
  RequestContextId.EMBED_WIDGET,
);

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);

  constructor(
    private readonly conversationsService: ConversationService,
    private readonly widgetsService: WidgetService,
    private readonly botsService: BotService,
    private readonly tasksService: TaskService,
  ) { }

  getScript(): string {
    // Compiled: dist/modules/embed/embed.service.js → dist/common/assets/...
    const distRelative = join(
      __dirname,
      '..',
      '..',
      'common',
      'assets',
      'default-widget-logo.svg',
    );
    const cwdDist = join(
      process.cwd(),
      'dist',
      'common',
      'assets',
      'default-widget-logo.svg',
    );
    const cwdSrc = join(
      process.cwd(),
      'src',
      'common',
      'assets',
      'default-widget-logo.svg',
    );
    let logoJson: string;
    try {
      logoJson = JSON.stringify(readFileSync(distRelative, 'utf8').trim());
    } catch {
      try {
        logoJson = JSON.stringify(readFileSync(cwdDist, 'utf8').trim());
      } catch {
        try {
          logoJson = JSON.stringify(readFileSync(cwdSrc, 'utf8').trim());
        } catch (err) {
          this.logger.warn(
            `Could not read default widget logo (tried dist-relative, cwd/dist, cwd/src); embed default logo will be empty.`,
            err instanceof Error ? err.message : err,
          );
          logoJson = JSON.stringify('');
        }
      }
    }
    return EMBED_SCRIPT.replace(/___DEFAULT_WIDGET_LOGO_SVG_JSON___/g, logoJson);
  }

  async createConversation(
    widgetAuthContext: WidgetAuthContext,
    dto: CreateWidgetConversationDto,
    modeQuery: string | undefined,
    pageUrl: string | undefined,
    domain?: string | undefined,
    path?: string | undefined,
  ): Promise<Conversation> {
    if (!dto.visitorId?.trim()) {
      throw new BadRequestException('visitorId is required');
    }

    const context: EmbedPageContext = {
      pageUrl: pageUrl?.trim() || null,
      domain: domain?.trim() || null,
      path: path?.trim() || null,
    };
    const resolvedBot = await this.resolveBot(widgetAuthContext.botId, context);

    const conversationBotId = resolvedBot.id;
    
    const conversation = await this.conversationsService.create(
      widgetCtx,
      conversationBotId,
      dto.visitorId,
      { forWidget: true },
    );

    const appearance = this.embedAppearanceFromQuery(modeQuery);
    let resolvedWidget = await this.widgetsService.findByBotIdAndMode(
      widgetCtx,
      conversationBotId,
      appearance,
      { forWidget: true },
    );
    if (!resolvedWidget) {
      const fallback =
        appearance === WidgetAppearance.DARK
          ? WidgetAppearance.LIGHT
          : WidgetAppearance.DARK;
      resolvedWidget = await this.widgetsService.findByBotIdAndMode(
        widgetCtx,
        conversationBotId,
        fallback,
        { forWidget: true },
      );
    }

    const welcome = (
      resolvedWidget?.welcomeMessage?.trim() ||
      DEFAULT_WIDGET_CONFIG.welcomeMessage
    ).trim();

    if (welcome) {
      await this.conversationsService.addMessage(
        widgetCtx,
        conversation.id,
        { content: welcome, sender: MessageSender.BOT },
        {
          forSystem: true,
          botId: conversationBotId,
          senderOverride: MessageSender.BOT,
          triggerBotReply: false,
        },
      );
    }
    
    return conversation;
  }

  async getMessages(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
    pageUrl?: string,
    domain?: string,
    path?: string,
  ): Promise<Message[]> {
    const context: EmbedPageContext = {
      pageUrl: pageUrl?.trim() || null,
      domain: domain?.trim() || null,
      path: path?.trim() || null,
    };

    const bot = await this.resolveBot(widgetAuthContext.botId, context);
    
    const c = await this.conversationsService.findOne(
      widgetCtx,
      conversationId,
      {
        forWidget: true,
        botId: bot.id,
        relations: [],
        orderMessages: 'ASC',
      },
    );
    return c.messages ?? [];
  }

  async addMessage(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
    dto: AddWidgetMessageDto,
    pageUrl?: string,
    domain?: string,
    path?: string,
  ): Promise<Message> {
    if (dto.sender != null && dto.sender !== MessageSender.USER) {
      throw new BadRequestException('Widget clients can only send USER messages');
    }

    const context: EmbedPageContext = {
      pageUrl: pageUrl?.trim() || null,
      domain: domain?.trim() || null,
      path: path?.trim() || null,
    };
    
    const bot = await this.resolveBot(widgetAuthContext.botId, context);

    return this.conversationsService.addMessage(
      widgetCtx,
      conversationId,
      { content: dto.content, sender: MessageSender.USER },
      {
        forWidget: true,
        forSystem: false,
        botId: bot.id,
        senderOverride: undefined,
        triggerBotReply: true,
      },
    );
  }

  async endConversation(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
    pageUrl?: string,
    domain?: string,
    path?: string,
  ): Promise<void> {
    const context: EmbedPageContext = {
      pageUrl: pageUrl?.trim() || null,
      domain: domain?.trim() || null,
      path: path?.trim() || null,
    };

    const bot = await this.resolveBot(widgetAuthContext.botId, context);

    return this.conversationsService.endConversation(conversationId, {
      forWidget: true,
      widgetRootBotId: bot.id,
    });
  }

  async getBotConfig(
    widgetAuthContext: WidgetAuthContext,
    modeQuery: string | undefined,
    pageUrl: string | undefined,
    domain?: string | undefined,
    path?: string | undefined,
  ): Promise<BotConfigResponseDto> {
    const context: EmbedPageContext = {
      pageUrl: pageUrl?.trim() || null,
      domain: domain?.trim() || null,
      path: path?.trim() || null,
    };

    const bot = await this.resolveBot(widgetAuthContext.botId, context);

    const appearance = this.embedAppearanceFromQuery(modeQuery);

    const resolvedBotWidget = await this.widgetsService.findByBotIdAndMode(
      widgetCtx,
      bot.id,
      appearance,
      { forWidget: true },
    );

    if (!resolvedBotWidget) {
      throw new BadRequestException('Widget config not found for resolved bot');
    }

    const taskChips = await this.tasksService.findWidgetChipsByBot(
      bot,
      context.pageUrl ?? null,
      context.domain ?? null,
      context.path ?? null,
    );

    return {
      name: bot.name,
      description: bot.description ?? null,
      introMessage: bot.introMessage ?? null,
      behavior: bot.behavior ?? null,
      oncePerSession: !!bot.oncePerSession,
      mode: resolvedBotWidget.mode,
      position: resolvedBotWidget.position,
      primaryColor: resolvedBotWidget.primaryColor,
      headerTextColor: resolvedBotWidget.headerTextColor,
      background: resolvedBotWidget.background,
      botMessageBg: resolvedBotWidget.botMessageBg,
      botMessageText: resolvedBotWidget.botMessageText,
      userMessageBg: resolvedBotWidget.userMessageBg,
      userMessageText: resolvedBotWidget.userMessageText,
      headerText: resolvedBotWidget.headerText,
      welcomeMessage: resolvedBotWidget.welcomeMessage,
      botLogoUrl: resolvedBotWidget.botLogoUrl,
      showPoweredBy: resolvedBotWidget.showPoweredBy,
      taskChips,
    };
  }

  private async resolveBot(
    botId: string,
    context: EmbedPageContext,
  ): Promise<Bot> {
    const tokenBot = await this.botsService.findOne(widgetCtx, botId, {
      forWidget: true,
    });

    if (
      tokenBot.botType !== BotType.GENERAL ||
      (!context.pageUrl?.trim() && !context.domain?.trim())
    ) {
      return tokenBot;
    }

    const children =
      await this.botsService.findActiveChildBotsByParentIdForWidget(
        widgetCtx,
        tokenBot.id,
      );

    const child = pickChildBotForEmbedContext(children, context);

    return child ?? tokenBot;
  }

  private embedAppearanceFromQuery(
    modeQuery: string | undefined,
  ): WidgetAppearance {
    return modeQuery?.trim().toLowerCase() === WidgetAppearance.DARK
      ? WidgetAppearance.DARK
      : WidgetAppearance.LIGHT;
  }
}
