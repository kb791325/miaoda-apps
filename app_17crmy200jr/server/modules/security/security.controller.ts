import { Controller, Get, Query } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';

@Controller('api/security')
export class SecurityController {
  constructor(private readonly securityLogService: SecurityLogService) {}

  @Get('events')
  getEvents(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    return {
      items: this.securityLogService.getAllEvents(Math.min(numLimit, 200)),
    };
  }

  @Get('stats')
  getStats() {
    return this.securityLogService.getStats();
  }

  @Get('audit')
  getAuditReport() {
    return this.securityLogService.getAuditReport();
  }
}