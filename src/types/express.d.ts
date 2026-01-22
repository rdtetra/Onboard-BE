import { RequestContext } from './request';

declare global {
  namespace Express {
    interface Request {
      requestContext?: RequestContext;
    }
  }
}

export {};
