import type { RoleName } from './roles';

export type RequestUser = {
  userId: string;
  email: string;
  organizationId?: string | null;
  roleName?: RoleName;
};

export type RequestContext = {
  user: RequestUser | null;
  url: string;
  method: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  requestId: string;
};
