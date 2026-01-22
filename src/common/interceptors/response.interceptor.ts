import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseFormat } from '../../types/response';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseFormat<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const url = request.url;

    return next.handle().pipe(
      map((data) => {
        const responseBody: ResponseFormat<T> = {
          url,
          message: ['Success'],
          success: true,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
        };

        if (data !== undefined && data !== null) {
          responseBody.data = data;
        }

        return responseBody;
      }),
    );
  }
}
