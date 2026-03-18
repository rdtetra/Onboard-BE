import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WIDGET_AUTH_CONTEXT_KEY } from '../guards/widget-auth.guard';
import type { WidgetAuthContext } from '../../types/widget-auth';

export const WidgetAuthContextDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): WidgetAuthContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request[WIDGET_AUTH_CONTEXT_KEY];
  },
);
