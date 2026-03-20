import type { Message } from '../common/entities/message.entity';
import type { MessageSender, MessageStatus } from './message';

export enum InAppEvents {
  SEND_MESSAGE = 'SEND_MESSAGE',
  MESSAGE_STATUS_UPDATED = 'MESSAGE_STATUS_UPDATED',
  BOT_REPLY_REQUIRED = 'BOT_REPLY_REQUIRED',
  BOT_STATUS_CHANGED = 'BOT_STATUS_CHANGED',
  JOIN_ROOM = 'JOIN_ROOM',
}

export enum WebSocketEvents {
  SEND_MESSAGE = 'SEND_MESSAGE',
  MESSAGE_STATUS_UPDATED = 'MESSAGE_STATUS_UPDATED',
  BOT_STATUS_CHANGED = 'BOT_STATUS_CHANGED',
  JOIN_ROOM = 'JOIN_ROOM',
}

export enum BotReplyStatus {
  THINKING = 'THINKING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export interface InAppSendMessagePayload {
  botId: string;
  visitorId: string;
  conversationId: string;
  message: Message;
}

export interface InAppMessageStatusPayload {
  botId: string;
  visitorId: string;
  conversationId: string;
  messageId: string;
  sender: MessageSender;
  status: MessageStatus;
  updatedAt: Date;
}

export interface InAppBotReplyRequiredPayload {
  botId: string;
  visitorId: string;
  conversationId: string;
  userMessageId: string;
  userContent: string;
}

export interface InAppBotStatusPayload {
  botId: string;
  visitorId: string;
  conversationId: string;
  status: BotReplyStatus;
  updatedAt: Date;
}
