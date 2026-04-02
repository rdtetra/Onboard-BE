import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { BotService } from '../../modules/bot/bot.service';
import { JwtWrapperService } from '../../modules/jwt/jwt.service';
import { RequestContextId } from '../enums/request-context.enum';
import type { RequestContext } from '../../types/request';
import type { WidgetAuthContext } from '../../types/widget-auth';
import { createRequestContext } from '../utils/request-context.util';
import {
  getEmbedPageUrlFromHeaders,
  isEmbedAllowedForBot,
} from '../../utils/embed-origin.util';

export const WIDGET_AUTH_CONTEXT_KEY = 'widgetAuthContext';

@Injectable()
export class WidgetAuthGuard implements CanActivate {
  constructor(
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly botsService: BotService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path ?? request.url ?? '';

    if (path.endsWith('/embed.js')) {
      return true;
    }

    const token = request.headers['x-widget-access-token'];
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new UnauthorizedException('Widget token required');
    }

    let authContext: WidgetAuthContext;
    try {
      authContext = this.jwtWrapperService.verify<WidgetAuthContext>(
        token.trim(),
        'widget',
      );
    } catch {
      throw new UnauthorizedException('Invalid widget token');
    }

    if (!authContext || typeof authContext !== 'object') {
      throw new UnauthorizedException('Invalid widget token: invalid payload');
    }
    if (authContext.type !== 'widget') {
      throw new UnauthorizedException(
        'Invalid widget token: missing or invalid type',
      );
    }
    if (
      !authContext.botId ||
      typeof authContext.botId !== 'string' ||
      !authContext.botId.trim()
    ) {
      throw new UnauthorizedException(
        'Invalid widget token: missing or invalid botId',
      );
    }

    const widgetCtx: RequestContext = createRequestContext({
      requestId: RequestContextId.WIDGET_AUTH_GUARD,
      user: null,
      url: request.path ?? request.url ?? '/embed',
      method: request.method ?? 'HTTP',
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });
    const bot = await this.botsService.findOne(widgetCtx, authContext.botId.trim(), {
      forWidget: true,
    });

    const pageUrl = getEmbedPageUrlFromHeaders(request.headers);
    if (!isEmbedAllowedForBot(bot, pageUrl)) {
      throw new UnauthorizedException(
        'Widget is not allowed on this site or URL',
      );
    }

    request[WIDGET_AUTH_CONTEXT_KEY] = authContext;
    return true;
  }
}
