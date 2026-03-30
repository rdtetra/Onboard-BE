export interface JoinRoomPayload {
  conversationId: string;
  token: string;
  pageUrl?: string;
}

export interface JoinRoomAck {
  ok: boolean;
  room?: string;
  error?: string;
}
