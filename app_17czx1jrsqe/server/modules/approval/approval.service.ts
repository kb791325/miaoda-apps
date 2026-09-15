import { Injectable, Logger, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BitableEntityService } from '../bitable/bitable.entity.service';
import { AuditService } from '../audit/audit.service';
import type {
  IApprovalSubmitRequest,
  IApprovalSubmitResponse,
  IApprovalAdvanceRequest,
  IApprovalAdvanceResponse,
  IApprovalStepView,
} from '@shared/api.interface';

const INSTANCE_TABLE = '审批-实例';
const STEP_TABLE = '审批-步骤';
const PURCHASE_REQ_TABLE = '采购-采购申请';
const PURCHASE_ORDER_TABLE = '采购-采购订单';
const DEPT_TABLE = '系统-部门';
const USER_TABLE = '系统-用户';

/** 两级审批阈值（元）：金额 ≥ 5000 走 部门经理 → 总经理，否则仅部门经理 */
const LEVEL2_THRESHOLD = 5000;

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v !== null && 'name' in v) {
    return String((v as Record<string, unknown>).name ?? '');
  }
  return String(v);
}

function nowStr(): string {
  const d = new Date();
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function genNo(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** 审批结果回写业务单据的上下文 */
interface BizWriteBackOutcome {
  status: '已通过' | '已驳回';
  rejectReason?: string;
  rejectStep?: string;
  operatorName?: string;
}

interface BizWriteBackConfig {
  tableKey: string;
  /** 业务单号字段（优先按它匹配，匹配不到再按记录 _id 兜底） */
  noField: string;
  /** 状态回写字段 */
  statusField: string;
  passExtra?: (o: BizWriteBackOutcome) => Record<string, unknown>;
  rejectExtra?: (o: BizWriteBackOutcome) => Record<string, unknown>;
}

/** 业务类型 → 业务表回写统一映射（前端/后端创建的实例共用；新增审批类型在此登记即可） */
const BIZ_WRITE_BACK: Record<string, BizWriteBackConfig> = {
  '采购申请': {
    tableKey: PURCHASE_REQ_TABLE,
    noField: '申请单号',
    statusField: '状态',
    passExtra: () => ({ '审批时间': nowStr() }),
    rejectExtra: (o) => ({ '驳回原因': o.rejectReason || '', '驳回环节': o.rejectStep || '' }),
  },
  '采购': {
    tableKey: PURCHASE_REQ_TABLE,
    noField: '申请单号',
    statusField: '状态',
    passExtra: () => ({ '审批时间': nowStr() }),
    rejectExtra: (o) => ({ '驳回原因': o.rejectReason || '', '驳回环节': o.rejectStep || '' }),
  },
  '采购订单': {
    tableKey: PURCHASE_ORDER_TABLE,
    noField: '订单编号',
    statusField: '状态',
    passExtra: () => ({ '订单状态': '待发货' }),
    rejectExtra: (o) => ({ '订单状态': '已取消', '驳回原因': o.rejectReason || '' }),
  },
  '开户申请': { tableKey: '广告-开户申请', noField: '申请编号', statusField: '状态' },
  '开户': { tableKey: '广告-开户申请', noField: '申请编号', statusField: '状态' },
  '报备': { tableKey: '广告-报备', noField: '报备编号', statusField: '状态' },
  '转户': { tableKey: '广告-转户', noField: '转户编号', statusField: '状态' },
  '合同': { tableKey: '合同-合同主表', noField: '合同编号', statusField: '合同状态' },
  '退款': {
    tableKey: '财务-退款',
    noField: '退款编号',
    statusField: '状态',
    passExtra: (o) => ({ '审批人': o.operatorName || '' }),
    rejectExtra: (o) => ({ '审批人': o.operatorName || '', '审批意见': o.rejectReason || '' }),
  },
  '支出': {
    tableKey: '财务-支出',
    noField: '支出编号',
    statusField: '审批状态',
    passExtra: (o) => ({ '审批人': o.operatorName || '' }),
    rejectExtra: (o) => ({ '审批人': o.operatorName || '' }),
  },
};

const PURCHASE_STATUS_ZH: Record<string, string> = {
  pending_approval: '待审批', approving: '审批中', approved: '已通过',
  rejected: '已驳回', purchased: '已采购', pending: '待发货',
  in_delivery: '配送中', delivered: '已送达', cancelled: '已取消',
};

export function statusZh(v: unknown): string {
  const s = toText(v).trim();
  return PURCHASE_STATUS_ZH[s] || s;
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly entity: BitableEntityService,
    private readonly audit: AuditService,
 ) {}

  /** 提交审批：创建实例 + 预设多级步骤（部门经理 → 总经理，按金额分级） */
  async submit(req: RequestWithUser, dto: IApprovalSubmitRequest): Promise<IApprovalSubmitResponse> {
    if (!dto.recordId || !dto.businessType) {
      throw new BadRequestException('缺少 recordId 或 businessType');
    }
    const bizDef = BIZ_WRITE_BACK[dto.businessType];
    const tableKey = bizDef?.tableKey ?? (dto.businessType === '采购订单' ? PURCHASE_ORDER_TABLE : PURCHASE_REQ_TABLE);
    const record = await this.entity.get(tableKey, dto.recordId);
    if (!record) throw new BadRequestException('业务单据不存在或已被删除');

    const bizNo = toText(record[bizDef?.noField ?? '申请单号'] ?? record['业务单据编号'] ?? record['申请单号'] ?? record['订单编号']);
    const dup = await this.findActiveInstance(dto.businessType, bizNo);
    if (dup) throw new ConflictException('该单据已存在进行中的审批，请勿重复提交');

    const applicant = dto.applicant || toText(record['申请人']) || req.userContext?.userName || '当前用户';
    const department = dto.department || toText(record['申请部门'] ?? record['部门']);
    const amount = num(record['申请金额'] ?? record['预计金额'] ?? record['订单金额']);
    const needLevel2 = amount >= LEVEL2_THRESHOLD;

    const [managerName, gmName] = await Promise.all([
      this.resolveDeptManager(department),
      this.resolveGeneralManager(),
    ]);

    const instanceNo = genNo('AP');
    const inst = await this.entity.create(INSTANCE_TABLE, {
      实例编号: instanceNo,
      业务类型: dto.businessType,
      业务单据编号: bizNo,
      审批标题: dto.title || `${dto.businessType}审批`,
      申请人: applicant,
      申请时间: nowStr(),
      当前节点: '部门经理审批',
      状态: '审批中',
    });
    const instanceId = String(inst?.['_id'] || inst?.['record_id'] || '');

    const steps: Array<{ name: string; role: string; approver: string }> = [
      { name: '部门经理审批', role: '部门经理', approver: managerName },
    ];
    if (needLevel2) {
      steps.push({ name: '总经理审批', role: '总经理', approver: gmName });
    }

    const stepViews: IApprovalStepView[] = [];
    for (let i = 0; i < steps.length; i += 1) {
      const s = steps[i];
      const created = await this.entity.create(STEP_TABLE, {
        步骤编号: `${instanceNo}-S${i + 1}`,
        实例编号: instanceNo,
        节点序号: i + 1,
        节点名称: s.name,
        审批方式: '逐级',
        审批人: s.approver,
        审批人角色: s.role,
        状态: '待审批',
      });
      stepViews.push({
        id: String(created?.['_id'] || created?.['record_id'] || ''),
        step_no: `${instanceNo}-S${i + 1}`,
        step_order: i + 1,
        step_name: s.name,
        approver: s.approver,
        approver_role: s.role,
        status: '待审批',
        comment: '',
        approve_time: '',
      });
    }

    if (dto.businessType === '采购申请') {
      await this.entity.update(tableKey, dto.recordId, { 状态: '审批中', 驳回原因: '', 驳回环节: '' });
    } else if (bizDef) {
      await this.entity.update(tableKey, dto.recordId, { [bizDef.statusField]: '审批中' });
    }

    this.logger.log(`审批已提交: ${dto.businessType} ${bizNo} 实例=${instanceNo} 两级=${needLevel2}`);
    await this.audit.writeOperationLog({
      req,
      module: '审批中心',
      opType: '审批提交',
      objectType: dto.businessType,
      objectNo: bizNo,
      summary: `提交审批「${dto.title || dto.businessType}」，实例=${instanceNo}，当前节点=部门经理审批`,
    });
    return { instance_id: instanceId, instance_no: instanceNo, steps: stepViews };
  }

  /** 推进审批：当前待审批步骤落结果，通过则流转下一级，完结时回写业务单据 */
  async advance(req: RequestWithUser, dto: IApprovalAdvanceRequest): Promise<IApprovalAdvanceResponse> {
    if (!dto.instanceId || !dto.action) throw new BadRequestException('缺少 instanceId 或 action');
    const inst = await this.entity.get(INSTANCE_TABLE, dto.instanceId);
    if (!inst) throw new NotFoundException('审批实例不存在');
    const instStatus = statusZh(inst['状态']);
    if (instStatus !== '审批中' && instStatus !== '待审批') {
      throw new ConflictException(`审批实例当前状态为「${instStatus}」，无法操作`);
    }

    const instanceNo = toText(inst['实例编号']);
    const bizType = toText(inst['业务类型']);
    const bizNo = toText(inst['业务单据编号']);
    const steps = await this.listSteps(instanceNo);
    const cur = steps.find((x) => x.status === '待审批');
    if (!cur) throw new ConflictException('没有待审批的步骤');

    const roles: string[] = Array.isArray(req.userContext?.roles) ? req.userContext.roles : [];
    this.assertCanOperate(cur.approver_role, roles);

    const pass = dto.action === 'approve';
    const comment = (dto.comment || '').trim();
    if (!pass && !comment) throw new BadRequestException('驳回时必须填写审批意见');

    await this.entity.update(STEP_TABLE, cur.id, {
      状态: pass ? '已通过' : '已驳回',
      审批意见: comment,
      审批时间: nowStr(),
      审批人: req.userContext?.userName || cur.approver,
    });

    const next = steps.find((x) => x.status === '待审批' && x.id !== cur.id);
    let finished = false;
    let instanceStatus: string;
    let currentNode: string;

    if (!pass) {
      finished = true;
      instanceStatus = '已驳回';
      currentNode = '已驳回';
      await this.writeBackBusiness(bizType, bizNo, {
        status: '已驳回',
        rejectReason: comment,
        rejectStep: cur.step_name,
        operatorName: req.userContext?.userName || '',
      });
    } else if (next) {
      instanceStatus = '审批中';
      currentNode = next.step_name;
    } else {
      finished = true;
      instanceStatus = '已通过';
      currentNode = '已完成';
      await this.writeBackBusiness(bizType, bizNo, {
        status: '已通过',
        operatorName: req.userContext?.userName || '',
      });
    }

    const patch: Record<string, unknown> = { 状态: instanceStatus, 当前节点: currentNode };
    if (finished) patch['完成时间'] = nowStr();
    await this.entity.update(INSTANCE_TABLE, dto.instanceId, patch);

    this.logger.log(`审批推进: ${bizType} ${bizNo} ${cur.step_name} → ${pass ? '通过' : '驳回'} 实例终态=${instanceStatus}`);
    await this.audit.writeOperationLog({
      req,
      module: '审批中心',
      opType: pass ? '审批通过' : '审批驳回',
      objectType: String(bizType),
      objectNo: bizNo,
      summary: `${cur.step_name} ${pass ? '通过' : '驳回'}，节点状态「待审批→${pass ? '已通过' : '已驳回'}」，实例终态「${instStatus}→${instanceStatus}」${comment ? `，审批意见: ${comment}` : ''}`,
    });
    return { instance_status: instanceStatus, current_node: currentNode, finished };
  }

  /** 按业务单据查询审批实例与步骤（审批历史，读取失败向上抛错） */
  async getByBusiness(businessType: string, businessNo: string) {
    const insts = await this.listAll(INSTANCE_TABLE);
    const it = insts
      .filter((x) => toText(x['业务类型']) === businessType && toText(x['业务单据编号']) === businessNo)
      .sort((a, b) => String(toText(b['申请时间'])).localeCompare(String(toText(a['申请时间']))))[0];
    if (!it) return { instance: null };
    const steps = await this.listSteps(toText(it['实例编号']));
    return {
      instance: {
        id: String(it['_id'] || it['record_id'] || ''),
        instance_no: toText(it['实例编号']),
        business_type: toText(it['业务类型']),
        business_no: bizNoOf(it),
        title: toText(it['审批标题']),
        applicant: toText(it['申请人']),
        status: toText(it['状态']),
        current_node: toText(it['当前节点']),
        steps,
      },
    };
  }

  private async writeBackBusiness(
    bizType: string,
    bizNo: string,
    outcome: BizWriteBackOutcome,
  ): Promise<void> {
    try {
      if (!bizNo) {
        this.logger.warn(`审批回写跳过: 业务单号为空 ${bizType}`);
        return;
      }
      const cfg = BIZ_WRITE_BACK[bizType];
      if (!cfg) {
        this.logger.warn(`审批回写跳过: 未登记业务类型 ${bizType}`);
        return;
      }
      const list = await this.listAll(cfg.tableKey);
      const target = list.find((x) => toText(x[cfg.noField]) === bizNo)
        || list.find((x) => String(x['_id'] || x['record_id'] || '') === bizNo);
      if (!target) {
        this.logger.warn(`审批回写未找到业务单据: ${bizType} ${bizNo}`);
        return;
      }
      const id = String(target['_id'] || target['record_id']);
      const patch: Record<string, unknown> = { [cfg.statusField]: outcome.status };
      if (outcome.status === '已通过' && cfg.passExtra) {
        Object.assign(patch, cfg.passExtra(outcome));
      }
      if (outcome.status === '已驳回' && cfg.rejectExtra) {
        Object.assign(patch, cfg.rejectExtra(outcome));
      }
      await this.entity.update(cfg.tableKey, id, patch);
      this.logger.log(`审批回写完成: ${bizType} ${bizNo} → ${outcome.status} ${JSON.stringify(patch)}`);
    } catch (err) {
      this.logger.error(`审批结果回写业务单据失败: ${bizType} ${bizNo} ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  /** 全量读取（错误向上抛出，不吞错） */
  private async listAll(tableKey: string): Promise<Array<Record<string, unknown>>> {
    const r = await this.entity.list(tableKey, { page: 1, pageSize: 500 });
    return (r.items || []) as Array<Record<string, unknown>>;
  }

  private async findActiveInstance(businessType: string, bizNo: string) {
    const insts = await this.listAll(INSTANCE_TABLE);
    return insts.find((x) =>
      toText(x['业务类型']) === businessType
      && toText(x['业务单据编号']) === bizNo
      && ['审批中', '待审批'].includes(toText(x['状态'])),
    );
  }

  private async listSteps(instanceNo: string): Promise<IApprovalStepView[]> {
    const rows = await this.listAll(STEP_TABLE);
    return rows
      .filter((x) => toText(x['实例编号']) === instanceNo)
      .sort((a, b) => num(a['节点序号']) - num(b['节点序号']))
      .map((x) => ({
        id: String(x['_id'] || x['record_id'] || ''),
        step_no: toText(x['步骤编号']),
        step_order: num(x['节点序号']),
        step_name: toText(x['节点名称']),
        approver: toText(x['审批人']),
        approver_role: toText(x['审批人角色']),
        status: toText(x['状态']),
        comment: toText(x['审批意见']),
        approve_time: toText(x['审批时间']),
      }));
  }

  private async safeList(tableKey: string): Promise<any[]> {
    try {
      const r = await this.entity.list(tableKey, { page: 1, pageSize: 200 });
      return r.items || [];
    } catch (err) {
      this.logger.error(`读取 ${tableKey} 失败: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  /** 部门经理：按申请部门在「系统-部门」匹配负责人 */
  private async resolveDeptManager(department: string): Promise<string> {
    try {
      const rows = await this.safeList(DEPT_TABLE);
      const dept = rows.find((x) => toText(x['部门名称']) === department && toText(x['状态']) !== '已禁用');
      const leader = dept ? toText(dept['负责人']) : '';
      return leader || '部门经理';
    } catch {
      return '部门经理';
    }
  }

  /** 总经理：在「系统-用户」中取 admin 角色且状态正常的用户 */
  private async resolveGeneralManager(): Promise<string> {
    try {
      const rows = await this.safeList(USER_TABLE);
      const gm = rows.find((x) => {
        const role = toText(x['角色']).toLowerCase();
        const status = toText(x['状态']);
        return (role === 'admin' || role.includes('admin') || role === '管理员') && status !== '已禁用';
      });
      return gm ? toText(gm['姓名']) : '总经理';
    } catch {
      return '总经理';
    }
  }

  /**
   * 审批权限：与全站写权限语义一致（checkWriteAccess）——
   * 平台 RBAC 未配置（roles 为空）时放行；admin 可审所有节点；部门经理节点要求 manager/admin
   */
  private assertCanOperate(stepRole: string, operatorRoles: string[]): void {
    const roles = (operatorRoles || []).map((r: string) => String(r).toLowerCase());
    if (roles.length === 0) return;
    if (roles.includes('admin')) return;
    if (stepRole === '部门经理' && roles.includes('manager')) return;
    throw new ForbiddenException(`当前节点为「${stepRole}」，您无权审批该节点`);
  }
}

interface RequestWithUser {
  userContext: {
    userId: string;
    userName: string;
    roles: string[];
  };
}

function bizNoOf(it: Record<string, unknown>): string {
  return toText(it['业务单据编号']);
}
