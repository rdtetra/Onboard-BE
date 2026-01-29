import { RoleName } from './roles';

export type JwtPayload = {
  email: string;
  sub: string;
};

export type JwtUser = {
  userId: string;
  email: string;
};

export type AuthResponse = {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
};

export type SessionResponse = {
  message: string;
  user: {
    email: string;
    fullName: string | null;
    roleName: RoleName;
  };
};
