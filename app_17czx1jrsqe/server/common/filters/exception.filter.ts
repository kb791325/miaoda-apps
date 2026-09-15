import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from '../interfaces/exception.interface';
import { HTTP_STATUS_TO_RESPONSE_CODE_MAP, ResponseCode } from '../constants/api_response_code';
import { ApiErrorResponse } from '../interfaces/api_response.interface';

const isProduction = process.env.NODE_ENV === 'production';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    let errorResponse: Omit<ApiErrorResponse, 'httpStatus'>;
    let httpStatus: HttpStatus;

    if (exception instanceof BusinessException) {
      httpStatus = exception.httpStatus;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          fieldErrors: exception.fieldErrors,
          timestamp: Date.now(),
        },
      };
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus() as HttpStatus;
      const exceptionResponse = exception.getResponse();

      if (isProduction) {
        // 生产环境：只返回通用错误信息，不暴露内部细节
        this.logger.error(
          `HttpException ${httpStatus}: ${JSON.stringify(exceptionResponse)}`,
          (exception as Error).stack,
        );
        errorResponse = {
          error: {
            code: HTTP_STATUS_TO_RESPONSE_CODE_MAP[httpStatus],
            message: httpStatus === 500 ? '服务器内部错误' : (exception.message || '请求失败'),
            timestamp: Date.now(),
          },
        };
      } else {
        errorResponse = {
          error: {
            code: HTTP_STATUS_TO_RESPONSE_CODE_MAP[httpStatus],
            message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
            details: typeof exceptionResponse === 'object' ? JSON.stringify(exceptionResponse) : undefined,
            timestamp: Date.now(),
          },
        };
      }
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: unknown }).code === '22P02'
    ) {
      httpStatus = HttpStatus.NOT_FOUND;
      errorResponse = {
        error: {
          code: ResponseCode.NOT_FOUND,
          message: '资源不存在',
          timestamp: Date.now(),
        },
      };
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(
        `未知异常: ${(exception as Error).message}`,
        (exception as Error).stack,
      );

      if (isProduction) {
        errorResponse = {
          error: {
            code: ResponseCode.INTERNAL_ERROR,
            message: '服务器内部错误',
            timestamp: Date.now(),
          },
        };
      } else {
        errorResponse = {
          error: {
            code: ResponseCode.INTERNAL_ERROR,
            message: '服务器内部错误',
            stack: (exception as Error).stack,
            cause: (exception as Error).cause as string,
            timestamp: Date.now(),
          },
        };
      }
    }

    response.status(httpStatus).json(errorResponse);
  }
}