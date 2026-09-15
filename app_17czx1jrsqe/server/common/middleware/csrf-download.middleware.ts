import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfDownloadMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfDownloadMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const isDownloadGet = req.method === 'GET' && req.originalUrl.includes('/api/upload/download');
    if (!isDownloadGet) {
      next();
      return;
    }

    const csrfCookie = req.cookies?.['n-token'];
    this.logger.log(`CSRF豁免: url=${req.originalUrl}, hasCookie=${!!csrfCookie}`);

    if (csrfCookie) {
      req.headers['x-n-token'] = csrfCookie;
    }

    next();
  }
}