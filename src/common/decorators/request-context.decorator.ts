import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestContext as RequestContextType } from '../../types/request';

export const RequestContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestContextType | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.requestContext;
  },
);
