import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';

/** Converts plain Error (e.g. from multer fileFilter) to 400 Bad Request */
@Catch(Error)
export class UploadExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response
      .status(400)
      .json({
        statusCode: 400,
        message: exception.message || 'Bad request',
        error: 'Bad Request',
      });
  }
}
