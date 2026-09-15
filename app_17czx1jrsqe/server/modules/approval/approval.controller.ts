import { Controller, Get, Post, Body, Query, Req, Logger } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { Inject } from '@nestjs/common';
import { BitableEntityService } from '../bitable/bitable.entity.service';
import { ApprovalService, statusZh } from './approval.service';
import type { IApprovalSubmitRequest, IApprovalAdvanceRequest } from '@shared/api.interface';
import type { Request } from 'express';

/** 历史数据里未落真实审批人的占位名（按节点角色回退判定可见性） */
const PLACEHOLDER_APPROVERS = new Set(['', '管理员', '审批人', '部门经理', '总经理']);

interface RequestWithUser {
  userContext: {
    userId: string;
    userName: string;
    roles: string[];
  };
}

@Controller('api/approvals')
@NeedLogin()
export class ApprovalController {
  private readonly logger = new Logger(ApprovalController.name);

  constructor(
    private readonly entityService: BitableEntityService,
    private readonly approvalService: ApprovalService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /** 提交审批：创建实例 + 多级步骤，回写业务状态 */
  @Post('submit')
  async submit(@Req() req: RequestWithUser, @Body() dto: IApprovalSubmitRequest) {
    return { code: 0, data: await this.approvalService.submit(req, dto) };
  }

  /** 审批推进：通过/驳回当前节点，完结时回写业务单据 */
  @Post('advance')
  async advance(@Req() req: RequestWithUser, @Body() dto: IApprovalAdvanceRequest) {
    return { code: 0, data: await this.approvalService.advance(req, dto) };
  }

  /** 按业务单据查审批历史 */
  @Get('by-business')
  async byBusiness(@Query('businessType') businessType?: string, @Query('businessNo') businessNo?: string) {
    const data = await this.approvalService.getByBusiness(businessType || '', businessNo || '');
    return { code: 0, data };
  }

  @Get('todo')
  async todo(
    @Query('status') status?: string,
    @Req() req?: RequestWithUser,
  ) {
    const stat = status || 'pending';
    const [ir, sr] = await Promise.all([
      this.entityService.list('审批-实例', { page: 1, pageSize: 500 }),
      this.entityService.list('审批-步骤', { page: 1, pageSize: 500 }),
    ]);

    const insts: any[] = ir.items || [];
    const steps: any[] = sr.items || [];

      const byNo: Record<string, any[]> = {};
      for (const x of steps) {
        const no = x['instance_no'] || x['实例编号'];
        if (!no) continue;
        (byNo[no] = byNo[no] || []).push(x);
      }

      const out: any[] = [];
      for (const it of insts) {
        const no = it['instance_no'] || it['实例编号'];
        const ss = (byNo[no] || []).slice().sort(
          (a: any, b: any) => (a['step_order'] || a['步骤序号'] || 0) - (b['step_order'] || b['步骤序号'] || 0),
        );
        const instStatus = it['status'] || it['状态'] || '';
        const running = instStatus === '待审批' || instStatus === '审批中';

        const base = {
          id: it['_id'] || it['record_id'],
          instance_id: it['_id'] || it['record_id'],
          business_type: it['business_type'] || it['业务类型'] || '',
          business_id: it['business_no'] || it['业务单据编号'] || '',
          title: it['title'] || it['审批标题'] || '',
          applicant_name: it['applicant'] || it['申请人'] || '',
          instance_status: instStatus,
          instance_created_at: it['apply_time'] || it['申请时间'] || '',
          created_at: it['apply_time'] || it['申请时间'] || '',
        };

        const uctx = (req as RequestWithUser)?.userContext;
        const userRoles: string[] = uctx?.roles || [];
        const role = String(userRoles[0] || '').toLowerCase();
        const legacyFallback = userRoles.length === 0 || role === 'admin';
        const userName = String(uctx?.userName || '').trim();
        if (stat === 'pending') {
          if (!running) continue;
          const cur = ss.find((x: any) => (x['status'] || x['状态']) === '待审批');
          if (!cur) continue;
          // 待办按当前审批人过滤：审批人=我；历史数据审批人是占位名时回退按节点角色（admin 全见）
          const nodeRole = String(cur['approver_role'] || cur['审批人角色'] || '');
          const approverName = String(cur['approver'] || cur['审批人'] || '').trim();
          const isMine = Boolean(userName) && approverName === userName;
          const isPlaceholder = PLACEHOLDER_APPROVERS.has(approverName);
          if (!isMine) {
            if (!isPlaceholder) continue;
            // 平台未配置角色或 admin 时回退原可见性规则，避免历史待办被藏掉
            if (!legacyFallback) {
              if (nodeRole === '部门经理' && role !== 'manager') continue;
              if (nodeRole === '总经理') continue;
            }
          }
          out.push({
            ...base,
            step_order: cur['step_order'] || cur['步骤序号'],
            step_name: cur['step_name'] || cur['步骤名称'],
            approver_name: cur['approver'] || cur['审批人'],
            status: 'current',
          });
        } else if (stat === 'done') {
          // 已办只展示当前登录审批人自己操作过的步骤；历史占位审批人数据仅 admin 可见
          for (const x of ss) {
            const s = x['status'] || x['状态'];
            if (s !== '已通过' && s !== '已驳回') continue;
            const approverName = String(x['approver'] || x['审批人'] || '').trim();
            const isMine = Boolean(userName) && approverName === userName;
            const isPlaceholder = PLACEHOLDER_APPROVERS.has(approverName);
            if (!isMine && !(isPlaceholder && legacyFallback)) continue;
            out.push({
              ...base,
              step_order: x['step_order'] || x['步骤序号'],
              step_name: x['step_name'] || x['步骤名称'],
              approver_name: x['approver'] || x['审批人'],
              status: s === '已通过' ? 'approved' : 'rejected',
              my_action: s === '已通过' ? 'approved' : 'rejected',
              my_comment: x['comment'] || x['审批意见'] || '',
              my_operated_at: x['approve_time'] || x['审批时间'] || '',
              approved_at: x['approve_time'] || x['审批时间'] || '',
            });
          }
        } else {
          // initiated
          const cur = ss[0];
          out.push({
            ...base,
            step_order: cur?.['step_order'] || cur?.['步骤序号'],
            step_name: cur?.['step_name'] || cur?.['步骤名称'],
            approver_name: cur?.['approver'] || cur?.['审批人'],
            status: running ? 'current' : (instStatus === '已通过' ? 'approved' : instStatus === '已驳回' ? 'rejected' : 'pending'),
            is_initiated_by_me: true,
            approval_steps: ss.map((x: any) => ({
              id: x['_id'] || x['record_id'],
              step_order: x['step_order'] || x['步骤序号'],
              step_name: x['step_name'] || x['步骤名称'],
              approver_name: x['approver'] || x['审批人'],
              status: x['status'] || x['状态'],
              comment: x['comment'] || x['审批意见'],
              approved_at: x['approve_time'] || x['审批时间'],
            })),
          });
        }
      }

      return { code: 0, data: { list: out, total: out.length } };
  }
}