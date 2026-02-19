import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import type { RequestContext } from '../../types/request';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'unknown';
  if (segments[0] === 'knowledge-base' && segments[1]) {
    return `knowledge-base/${segments[1]}`;
  }
  return segments[0];
}

function getActionFromMethod(method: string): string {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return method;
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const ctx: RequestContext | undefined = request.requestContext;
    const method = request.method;
    const path = request.route?.path ?? request.path ?? request.url;

    if (!MUTATION_METHODS.has(method) || !ctx) {
      return next.handle();
    }
    if (path.startsWith('/auth') || path.startsWith('auth/')) {
      return next.handle();
    }

    const resource = getResourceFromPath(path);
    const action = getActionFromMethod(method);
    const resourceId = request.params?.id ?? null;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService
            .log(ctx, { action, resource, resourceId })
            .catch(() => {
              // Don't fail the request if audit write fails
            });
        },
      }),
    );
  }
}
