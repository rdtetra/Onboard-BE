export type RequestUser = {
  userId: string;
  email: string;
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
