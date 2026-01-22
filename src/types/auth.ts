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
    firstName: string | null;
    lastName: string | null;
  };
};
