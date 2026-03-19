import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WIDGET_AUTH_CONTEXT_KEY } from '../guards/widget-auth.guard';
import type { WidgetAuthContext as WidgetAuthContextPayload } from '../../types/widget-auth';

export const WidgetAuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): WidgetAuthContextPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request[WIDGET_AUTH_CONTEXT_KEY];
  },
);
