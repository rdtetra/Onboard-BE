import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConversationsService } from '../conversations/conversations.service';
import { WidgetsService } from '../widgets/widgets.service';
import { BotsService } from '../bots/bots.service';
import { Conversation } from '../../common/entities/conversation.entity';
import { Message } from '../../common/entities/message.entity';
import { MessageSender } from '../../types/message';
import { RequestContextId, type RequestContext } from '../../types/request';
import type { WidgetAuthContext } from '../../types/widget-auth';
import { EMBED_SCRIPT } from './embed.script';
import { CreateWidgetConversationDto } from './dto/create-widget-conversation.dto';
import { AddWidgetMessageDto } from './dto/add-widget-message.dto';
import type { BotConfigResponseDto } from './dto/bot-config.response';
import { DEFAULT_WIDGET_CONFIG } from '../../common/constants/widget-config';
import { WidgetAppearance } from '../../types/widget';
import { createInternalContext } from '../../common/utils/request-context.util';

const widgetCtx: RequestContext = createInternalContext(
  RequestContextId.EMBED_WIDGET,
);

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly widgetsService: WidgetsService,
    private readonly botsService: BotsService,
  ) {}

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
  ): Promise<Conversation> {
    if (!dto.visitorId?.trim()) {
      throw new BadRequestException('visitorId is required');
    }
    return this.conversationsService.create(
      widgetCtx,
      widgetAuthContext.botId,
      dto.visitorId,
      { forWidget: true },
    );
  }

  async getMessages(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
  ): Promise<Message[]> {
    const c = await this.conversationsService.findOne(
      widgetCtx,
      conversationId,
      {
        forWidget: true,
        botId: widgetAuthContext.botId,
        relations: [],
        orderMessages: 'ASC',
      },
    );
    return c.messages ?? [];
  }

  addMessage(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
    dto: AddWidgetMessageDto,
  ): Promise<Message> {
    const sender = dto.sender === MessageSender.BOT ? MessageSender.BOT : MessageSender.USER;
    const isBot = sender === MessageSender.BOT;
    return this.conversationsService.addMessage(
      widgetCtx,
      conversationId,
      { content: dto.content, sender },
      {
        forWidget: !isBot,
        forSystem: isBot,
        botId: widgetAuthContext.botId,
        senderOverride: isBot ? MessageSender.BOT : undefined,
        triggerBotReply: !isBot,
      },
    );
  }

  endConversation(
    widgetAuthContext: WidgetAuthContext,
    conversationId: string,
  ): Promise<void> {
    return this.conversationsService.endConversation(conversationId, {
      forWidget: true,
      botId: widgetAuthContext.botId,
    });
  }

  async getBotConfig(
    widgetAuthContext: WidgetAuthContext,
    modeQuery?: string,
  ): Promise<BotConfigResponseDto> {
    const bot = await this.botsService.findOne(widgetCtx, widgetAuthContext.botId, {
      forWidget: true,
    });

    const appearance =
      modeQuery?.trim().toLowerCase() === WidgetAppearance.DARK
        ? WidgetAppearance.DARK
        : WidgetAppearance.LIGHT;

    const widget = await this.widgetsService.findByBotIdAndMode(
      widgetCtx,
      widgetAuthContext.botId,
      appearance,
      { forWidget: true },
    );
    const d = DEFAULT_WIDGET_CONFIG;

    return {
      name: bot.name,
      description: bot.description ?? null,
      introMessage: bot.introMessage ?? null,
      behavior: bot.behavior ?? null,

      mode: widget?.mode ?? d.mode,
      position: widget?.position ?? d.position,
      primaryColor: widget?.primaryColor ?? d.primaryColor,
      headerTextColor: widget?.headerTextColor ?? d.headerTextColor,
      background: widget?.background ?? d.background,
      botMessageBg: widget?.botMessageBg ?? d.botMessageBg,
      botMessageText: widget?.botMessageText ?? d.botMessageText,
      userMessageBg: widget?.userMessageBg ?? d.userMessageBg,
      userMessageText: widget?.userMessageText ?? d.userMessageText,

      headerText: widget?.headerText ?? d.headerText,
      welcomeMessage:
        widget?.welcomeMessage ?? bot.introMessage ?? d.welcomeMessage,
      botLogoUrl: widget?.botLogoUrl ?? d.botLogoUrl,
      showPoweredBy: widget?.showPoweredBy ?? d.showPoweredBy,
    };
  }
}
