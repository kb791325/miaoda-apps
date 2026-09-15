import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { Request } from 'express';
import { ErrorTrackerService } from './error-tracker.service';

@Injectable()
export class ErrorCaptureInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorCaptureInterceptor.name);

  constructor(private readonly errorTracker: ErrorTrackerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: Error) => {
        const httpContext = context.switchToHttp();
        const req = httpContext.getRequest<Request>();
        const method = req.method ?? 'UNKNOWN';
        const url = req.originalUrl ?? req.url ?? 'UNKNOWN';
        const userCtx: Record<string, unknown> | undefined = (req as unknown as Record<string, unknown>).userContext as Record<string, unknown> | undefined;
        const userId: string | undefined = userCtx?.userId as string | undefined;

        this.errorTracker.captureError(error, { method, url, userId });
        return throwError(() => error);
      }),
    );
  }
}