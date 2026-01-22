import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RequestContext } from './common/decorators/request-context.decorator';
import type { RequestContext as RequestContextType } from './types/request';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@RequestContext() ctx: RequestContextType): string {
    return this.appService.getHello(ctx);
  }
}
