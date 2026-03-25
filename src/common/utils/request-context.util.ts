import type { RequestContext, RequestUser } from '../../types/request';

type CreateRequestContextInput = {
  requestId: string;
  user?: RequestUser | null;
  url?: string | null;
  method?: string | null;
  ip?: string;
  userAgent?: string;
};

export function createRequestContext(
  input: CreateRequestContextInput,
): RequestContext {
  return {
    user: input.user ?? null,
    url: input.url ?? null,
    method: input.method ?? null,
    timestamp: new Date().toISOString(),
    requestId: input.requestId,
    ...(input.ip ? { ip: input.ip } : {}),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
  };
}

export function createInternalContext(requestId: string): RequestContext {
  return createRequestContext({ requestId, user: null, url: null, method: null });
}
