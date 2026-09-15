import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    res.removeHeader('X-Powered-By');
    res.removeHeader('X-Frame-Options');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.feishucdn.com https://*.bytescm.com https://*.ibytedapm.com; " +
      "style-src 'self' 'unsafe-inline' https://*.feishucdn.com https://*.feishu.cn; " +
      "font-src 'self' data: https://*.feishucdn.com https://*.feishu.cn; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https:; " +
      "worker-src 'self' blob:; " +
      "frame-src 'self' blob: data: https://*.feishu.cn https://*.feishucdn.com; " +
      "frame-ancestors 'self' https://*.feishu.cn https://*.feishucdn.com https://*.larkoffice.com https://*.larksuite.com https://*.aiforce.cloud https://*.aiforce.run; " +
      "object-src 'none'; " +
      "base-uri 'self'",
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  }
}
