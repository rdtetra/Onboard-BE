import type { Message } from '../common/entities/message.entity';

export enum InAppEvents {
  SEND_MESSAGE = 'SEND_MESSAGE',
  JOIN_ROOM = 'JOIN_ROOM',
}

export enum WebSocketEvents {
  SEND_MESSAGE = 'SEND_MESSAGE',
  JOIN_ROOM = 'JOIN_ROOM',
}

export interface InAppSendMessagePayload {
  botId: string;
  visitorId: string;
  conversationId: string;
  message: Message;
}
