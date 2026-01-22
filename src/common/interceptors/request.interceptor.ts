import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContext, RequestUser } from '../../types/request';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const url = request.url;
    const method = request.method;
    const ip = request.ip || request.connection?.remoteAddress || request.socket?.remoteAddress;
    const userAgent = request.get('user-agent') || undefined;
    const timestamp = new Date().toISOString();
    const requestId = uuidv4();

    // Extract user from request (set by JWT guard)
    let user: RequestUser | null = null;
    if (request.user) {
      user = {
        userId: request.user.userId,
        email: request.user.email,
      };
    }

    const requestContext: RequestContext = {
      user,
      url,
      method,
      timestamp,
      ip,
      userAgent,
      requestId,
    };

    // Attach context to request object
    request.requestContext = requestContext;

    return next.handle();
  }
}
