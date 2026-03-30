import type { RoleName } from './roles';

export type RequestUser = {
  userId: string;
  email: string;
  organizationId?: string | null;
  roleName?: RoleName;
  impersonatedByUserId?: string;
};

export type RequestContext = {
  user: RequestUser | null;
  url: string | null;
  method: string | null;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  requestId: string;
};

export enum RequestContextId {
  EMBED_WIDGET = 'embed-widget',
  WIDGET_AUTH_GUARD = 'widget-auth-guard',
  WS_BOT_AUTH = 'ws-bot-auth',
  WS_JOIN_ROOM = 'ws-join-room',
  OPENAI_BOT_REPLY = 'openai-bot-reply',
  KB_RETRIEVAL_BOT = 'kb-retrieval-bot',
  KB_INDEXING = 'kb-indexing',
  TOKEN_TRANSACTIONS_INTERNAL = 'token-transactions-internal',
}
