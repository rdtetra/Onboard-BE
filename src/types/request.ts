import type { RoleName } from '../common/enums/roles.enum';

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
