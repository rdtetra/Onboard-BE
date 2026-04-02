export type JoinRoomPayload = {
  conversationId: string;
  token: string;
  pageUrl?: string;
};

export type JoinRoomAck = {
  ok: boolean;
  room?: string;
  error?: string;
};
