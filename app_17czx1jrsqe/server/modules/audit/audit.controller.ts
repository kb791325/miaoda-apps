import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { AuditService, type RequestWithUser } from './audit.service';

interface OperationLogDto {
  module?: string;
  op_type?: string;
  object_type?: string;
  object_no?: string;
  summary?: string;
  result?: string;
  fail_reason?: string;
}

interface LoginLogDto {
  mode?: string;
  status?: string;
  fail_reason?: string;
  session_id?: string;
  remark?: string;
}

@Controller('api/audit')
@NeedLogin()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Post('operation')
  @HttpCode(HttpStatus.OK)
  async logOperation(@Req() req: Request, @Body() dto: OperationLogDto) {
    const module = String(dto.module || '').trim();
    const opType = String(dto.op_type || '').trim();
    const summary = String(dto.summary || '').trim();
    if (!module || !opType || !summary) {
      throw new BadRequestException('module、op_type、summary 不能为空');
    }
    const result = dto.result === '失败' ? '失败' as const : '成功' as const;
    await this.audit.writeOperationLog({
      req: req as RequestWithUser,
      module,
      opType,
      objectType: dto.object_type ? String(dto.object_type) : undefined,
      objectNo: dto.object_no ? String(dto.object_no) : undefined,
      summary,
      result,
      failReason: dto.fail_reason ? String(dto.fail_reason) : undefined,
    });
    return { code: 0, data: true };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async logLogin(@Req() req: Request, @Body() dto: LoginLogDto) {
    const mode = String(dto.mode || '').trim();
    if (!mode) {
      throw new BadRequestException('mode 不能为空');
    }
    const status = dto.status === '失败' ? '失败' as const : '成功' as const;
    await this.audit.writeLoginLog({
      req: req as RequestWithUser,
      mode,
      status,
      failReason: dto.fail_reason ? String(dto.fail_reason) : undefined,
      sessionId: dto.session_id ? String(dto.session_id) : undefined,
      remark: dto.remark ? String(dto.remark) : undefined,
    });
    return { code: 0, data: true };
  }
}
