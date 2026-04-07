import { Injectable, OnModuleInit } from '@nestjs/common';
import { InAppEvents } from '../../common/enums/events.enum';
import type { InAppBotReplyRequiredPayload } from '../../types/events';
import { InAppEventsService } from '../events/in-app-events.service';
import { OpenAiService } from './openai.service';

@Injectable()
export class OpenAiBotReplyListener implements OnModuleInit {
  constructor(
    private readonly inAppEventsService: InAppEventsService,
    private readonly openAiService: OpenAiService,
  ) {}

  onModuleInit(): void {
    this.inAppEventsService.on(
      InAppEvents.BOT_REPLY_REQUIRED,
      (payload: InAppBotReplyRequiredPayload) => {
        void this.openAiService.processBotReply(payload);
      },
    );
  }
}
