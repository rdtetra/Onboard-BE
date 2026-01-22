import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseFormat } from '../../types/response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messages: string[] = ['Internal server error'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        messages = [exceptionResponse];
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(responseObj.message)) {
          messages = responseObj.message;
        } else if (typeof responseObj.message === 'string') {
          messages = [responseObj.message];
        } else if (responseObj.error) {
          messages = [responseObj.error];
        }
      }
    } else if (exception instanceof Error) {
      messages = [exception.message];
    }

    const responseBody: ResponseFormat = {
      url: request.url,
      message: messages,
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(responseBody);
  }
}
