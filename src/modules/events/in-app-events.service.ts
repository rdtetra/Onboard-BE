import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  type InAppBotReplyRequiredPayload,
  type InAppBotStatusPayload,
  InAppEvents,
  type InAppMessageStatusPayload,
  type InAppSendMessagePayload,
} from '../../types/events';

type EventPayloadMap = {
  [InAppEvents.SEND_MESSAGE]: InAppSendMessagePayload;
  [InAppEvents.MESSAGE_STATUS_UPDATED]: InAppMessageStatusPayload;
  [InAppEvents.BOT_REPLY_REQUIRED]: InAppBotReplyRequiredPayload;
  [InAppEvents.BOT_STATUS_CHANGED]: InAppBotStatusPayload;
  [InAppEvents.JOIN_ROOM]: { room: string };
};

@Injectable()
export class InAppEventsService {
  private readonly emitter = new EventEmitter();

  emit<K extends keyof EventPayloadMap>(event: K, payload: EventPayloadMap[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  on<K extends keyof EventPayloadMap>(
    event: K,
    handler: (payload: EventPayloadMap[K]) => void | Promise<void>,
  ): void {
    this.emitter.on(event, handler as (payload: unknown) => void);
  }
}
