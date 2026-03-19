import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebsocketEventsService {
  private readonly logger = new Logger(WebsocketEventsService.name);

  constructor() {}

  onConnection(clientId: string): void {
    this.logger.log(`Socket connected: ${clientId}`);
  }

  onDisconnection(clientId: string): void {
    this.logger.log(`Socket disconnected: ${clientId}`);
  }

}
