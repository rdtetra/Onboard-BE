import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebsocketEventsService {
  private readonly logger = new Logger(WebsocketEventsService.name);

  constructor() {}

  onConnect(clientId: string): void {
    this.logger.log(`Socket connected: ${clientId}`);
  }

  onDisconnect(clientId: string): void {
    this.logger.log(`Socket disconnected: ${clientId}`);
  }
}
