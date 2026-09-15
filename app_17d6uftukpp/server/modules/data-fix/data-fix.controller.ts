import { Controller, Post } from '@nestjs/common';
import { DataFixService } from './data-fix.service';

@Controller('api/data-fix')
export class DataFixController {
  constructor(private readonly dataFixService: DataFixService) {}

  @Post('audit-logs')
  async fixAuditLogs() {
    return this.dataFixService.fixAuditLogs();
  }

  @Post('attendance')
  async fixAttendance() {
    return this.dataFixService.fixAttendance();
  }

  @Post('sign-in')
  async fixSignIn() {
    return this.dataFixService.fixSignIn();
  }

  @Post('material')
  async fixMaterial() {
    return this.dataFixService.fixMaterial();
  }

  @Post('all')
  async fixAll() {
    const results = {
      auditLogs: await this.dataFixService.fixAuditLogs(),
      attendance: await this.dataFixService.fixAttendance(),
      signIn: await this.dataFixService.fixSignIn(),
      material: await this.dataFixService.fixMaterial(),
    };
    return results;
  }
}