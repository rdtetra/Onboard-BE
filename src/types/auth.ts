import type { RoleName } from './roles';

export type JwtPayload = {
  sub: string;
  email?: string;
  isImpersonation?: boolean;
  impersonatedBy?: string;
  role?: { id: string; name: RoleName };
};

export type JwtUser = {
  userId: string;
  email: string;
  roleName?: RoleName;
  organizationId?: string | null;
  impersonatedByUserId?: string;
};

export type AuthResponse = {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    passwordChangeRequired: boolean;
  };
};

export type SessionResponse = {
  message: string;
  user: {
    email: string;
    fullName: string | null;
    profilePictureUrl: string | null;
    roleName: RoleName;
    passwordChangeRequired: boolean;
  };
};

export type ImpersonateResponse = {
  access_token: string;
};
