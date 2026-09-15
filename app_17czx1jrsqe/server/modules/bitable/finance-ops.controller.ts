import { Controller, Post, HttpCode, HttpStatus, Logger, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { FinanceLinkageService, type RecalcBalancesResult } from './finance-linkage.service';
import { AuditService, type RequestWithUser } from '../audit/audit.service';

@Controller('api/finance')
@NeedLogin()
export class FinanceOpsController {
  private readonly logger = new Logger(FinanceOpsController.name);

  constructor(
    private readonly financeLinkage: FinanceLinkageService,
    private readonly audit: AuditService,
  ) {}

  @Post('recalc-balances')
  @HttpCode(HttpStatus.OK)
  async recalcBalances(@Req() req: Request) {
    this.logger.log('收到端口账户余额重算请求');
    const data = await this.financeLinkage.recalcAllPortBalances();
    const summary = `端口余额重算：端口数=${data.summary.port_count}，重算=${data.summary.recalculated}，未匹配端口=${data.summary.unmatched_ports.length}`;
    await this.audit.writeOperationLog({
      req: req as RequestWithUser,
      module: '财务资金',
      opType: '配置变更',
      objectType: '端口账户',
      summary,
    });
    return { code: 0, data };
  }
}
