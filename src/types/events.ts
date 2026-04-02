import type { Message } from '../common/entities/message.entity';
import type { MessageSender, MessageStatus } from '../common/enums/message.enum';
import type { BotReplyStatus } from '../common/enums/events.enum';

export type InAppSendMessagePayload = {
  botId: string;
  visitorId: string;
  conversationId: string;
  message: Message;
};

export type InAppMessageStatusPayload = {
  botId: string;
  visitorId: string;
  conversationId: string;
  messageId: string;
  sender: MessageSender;
  status: MessageStatus;
  updatedAt: Date;
};

export type InAppBotReplyRequiredPayload = {
  botId: string;
  visitorId: string;
  conversationId: string;
  userMessageId: string;
  userContent: string;
};

export type InAppBotStatusPayload = {
  botId: string;
  visitorId: string;
  conversationId: string;
  status: BotReplyStatus;
  updatedAt: Date;
};

export type InAppBotStreamDeltaPayload = {
  botId: string;
  visitorId: string;
  conversationId: string;
  delta: string;
};
