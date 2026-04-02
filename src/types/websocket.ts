export type JoinRoomPayload = {
  conversationId: string;
  token: string;
  pageUrl?: string;
  domain?: string;
  path?: string;
};

export type JoinRoomAck = {
  ok: boolean;
  room?: string;
  error?: string;
};
