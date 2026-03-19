import { Global, Module } from '@nestjs/common';
import { InAppEventsService } from './in-app-events.service';

@Global()
@Module({
  providers: [InAppEventsService],
  exports: [InAppEventsService],
})
export class EventsModule {}
