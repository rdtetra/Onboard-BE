import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtWrapperService } from '../../modules/jwt/jwt.service';
import type { WidgetAuthContext } from '../../types/widget-auth';

export const WIDGET_AUTH_CONTEXT_KEY = 'widgetAuthContext';

@Injectable()
export class WidgetAuthGuard implements CanActivate {
  constructor(private readonly jwtWrapperService: JwtWrapperService) {}

  canActivate(context: ExecutionContext): boolean {
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

    request[WIDGET_AUTH_CONTEXT_KEY] = authContext;
    return true;
  }
}
