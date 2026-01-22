import { Injectable } from '@nestjs/common';
import type { RequestContext } from './types/request';

@Injectable()
export class AppService {
  getHello(ctx: RequestContext): string {
    return 'Hello World!';
  }
}
