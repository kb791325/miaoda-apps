import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BitableEntityService } from './bitable.entity.service';

const PORT_ACCOUNT_TABLE = '财务-端口账户';
const FLOW_TABLE = '财务-客户流水';

/** 参与联动的 8 张财务表（端口账户/客户流水本身为联动产物，无独立联动规则） */
const LINKAGE_TABLES = new Set([
  '财务-充值',
  '财务-扣减',
  '财务-后返',
  '财务-退币',
  '财务-退款',
  '财务-消耗',
  PORT_ACCOUNT_TABLE,
  FLOW_TABLE,
]);

/** 5 张含状态字段的单据表 */
const STATUS_TABLES = new Set([
  '财务-充值',
  '财务-扣减',
  '财务-后返',
  '财务-退币',
  '财务-退款',
]);

interface FlowDraft {
  customerName: string;
  entityName?: string;
  txType: string;
  incomeAmount?: number;
  expenseAmount?: number;
  remark: string;
  createdAt?: string;
}

type AccountDelta = Partial<{ recharge: number; consume: number; balance: number; grant: number }>

export interface RecalcBalanceSnapshot {
  累计充值: number;
  累计消耗: number;
  账户余额: number;
  赠款余额: number;
}

export interface RecalcPortResult {
  端口名称: string;
  端口账户_id: string;
  是否选中: boolean;
  重算前: RecalcBalanceSnapshot;
  重算后: RecalcBalanceSnapshot;
  是否变化: boolean;
}

export interface UnmatchedPort {
  端口原值: string;
  归一值: string;
  单据数: number;
}

export interface RecalcBalancesResult {
  ports: RecalcPortResult[];
  summary: {
    port_count: number;
    recalculated: number;
    counted: { 充值: number; 消耗: number; 扣减: number; 后返: number; 退币: number };
    unmatched_ports: UnmatchedPort[];
  };
};

interface AccountSnapshot {
  total_recharge: number;
  total_consume: number;
  balance: number;
  grant: number;
}

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

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class FinanceLinkageService {
  private readonly logger = new Logger(FinanceLinkageService.name);

  constructor(private readonly entity: BitableEntityService) {}

  isFinanceTable(tableKey: string): boolean {
    return LINKAGE_TABLES.has(tableKey);
  }

  isStatusTable(tableKey: string): boolean {
    return STATUS_TABLES.has(tableKey);
  }

  /** 端口归一化：trim、忽略大小写与空格，别名字典映射 */
  normalizePort(raw: unknown): string {
    const s = String(raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
    if (/^(腾讯广告|腾讯|广点通)$/.test(s)) return '腾讯广告';
    if (/^(磁力引擎|磁力)$/.test(s)) return '磁力引擎';
    if (/^(巨量千川|千川|巨量)$/.test(s)) return '巨量';
    if (/^小红书$/.test(s)) return '小红书';
    if (/^(百度营销|百度)$/.test(s)) return '百度营销';
    if (/^(快手本地推|快手)$/.test(s)) return '快手本地推';
    return s;
  }

  /** 状态归一化：统一历史多套枚举 */
  normalizeStatus(tableKey: string, raw: unknown): string {
    const s = String(raw ?? '').trim().toLowerCase();
    const maps: Record<string, [string[], string][]> = {
      '财务-充值': [
        [['arrived', '已充值', '已到账', '充值成功'], 'arrived'],
        [['failed', '失败', '充值失败'], 'failed'],
        [['pending', '待充值', '待处理', '处理中'], 'pending'],
      ],
      '财务-扣减': [
        [['已扣减', 'deducted'], '已扣减'],
        [['待处理', 'pending'], '待处理'],
      ],
      '财务-后返': [
        [['已确认', '已结算', 'confirmed'], '已确认'],
        [['待确认', 'pending'], '待确认'],
      ],
      '财务-退币': [
        [['已退币', 'refunded', 'approved'], '已退币'],
        [['已驳回', 'rejected'], '已驳回'],
        [['待审批', 'pending'], '待审批'],
      ],
      '财务-退款': [
        [['已退款', 'refunded'], '已退款'],
        [['已驳回', 'rejected'], '已驳回'],
        [['待审批', '审批中', 'pending'], '待审批'],
      ],
    };
    const entries = maps[tableKey] ?? [];
    for (const [variants, canonical] of entries) {
      if (variants.some((v) => v.toLowerCase() === s)) return canonical;
    }
    return String(raw ?? '').trim();
  }

  isTerminal(tableKey: string, status: unknown): boolean {
    const s = this.normalizeStatus(tableKey, toText(status));
    switch (tableKey) {
      case '财务-充值': return s === 'arrived';
      case '财务-扣减': return s === '已扣减';
      case '财务-后返': return s === '已确认';
      case '财务-退币': return s === '已退币';
      case '财务-退款': return s === '已退款';
      default: return false;
    }
  }

  /** 外部写入入口：写入前把传入的 状态 归一为标准值 */
  normalizeIncomingStatus(tableKey: string, fields: Record<string, any>): void {
    if (!this.isStatusTable(tableKey)) return;
    if (fields['状态'] !== undefined) {
      fields['状态'] = this.normalizeStatus(tableKey, fields['状态']);
    }
  }

  /** 在给定账户列表中按确定性规则选取端口账户；0 条返回 null，多条时状态=正常且累计充值最大优先 */
  private pickAccount(
    accounts: any[],
    portRaw: unknown,
  ): { record: any; id: string; duplicates: number } | null {
    const target = this.normalizePort(portRaw);
    const matches = accounts
      .filter((r) => this.normalizePort(toText(r['端口名称'])) === target)
      .map((r) => ({ record: r, id: String(r._id ?? '') }))
      .filter((x) => x.id);
    if (matches.length === 0) return null;
    if (matches.length === 1) return { ...matches[0], duplicates: 1 };
    const scored = matches
      .map((m) => ({
        ...m,
        active: toText(m.record['状态']).trim() === '正常',
        total: num(m.record['累计充值']),
      }))
      .sort((a, b) => b.total - a.total);
    const best = scored.find((s) => s.active) ?? scored[0];
    return { record: best.record, id: best.id, duplicates: matches.length };
  }

  /** 金额脏数据防御：非数字按 0 计入并 warn（带表名/记录_id/字段），不中断重算 */
  private numSafe(tableKey: string, recordId: unknown, field: string, value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    if (!Number.isFinite(n)) {
      this.logger.warn(
        `余额重算脏数据：${tableKey} 记录 ${String(recordId)} 字段 ${field} 值「${String(value)}」非数字，按 0 计入`,
      );
      return 0;
    }
    return n;
  }

  /** 查找端口账户：拉全后内存按归一名匹配；0 条报错，多条确定性选取并 warn */
  async findAccount(portRaw: unknown): Promise<{ record: any; id: string }> {
    const picked = this.pickAccount(await this.listAll(PORT_ACCOUNT_TABLE), portRaw);
    if (!picked) {
      throw new BadRequestException(`未找到端口账户：${toText(portRaw)}`);
    }
    if (picked.duplicates > 1) {
      this.logger.warn(
        `端口账户主数据重复 [${this.normalizePort(portRaw)}]，命中 ${picked.duplicates} 条，选择 ${picked.id}（状态=${toText(picked.record['状态'])}，累计充值=${num(picked.record['累计充值'])}）`,
      );
    }
    return { record: picked.record, id: picked.id };
  }

  /** ==================== 生命周期钩子 ==================== */

  async afterCreate(tableKey: string, record: any): Promise<void> {
    if (!LINKAGE_TABLES.has(tableKey)) return;
    switch (tableKey) {
      case '财务-充值': await this.maybeRecharge(record, record['状态']); break;
      case '财务-扣减': await this.maybeDeduct(record, record['状态']); break;
      case '财务-后返': await this.maybeRebate(record, record['状态']); break;
      case '财务-退币': await this.maybeCoinRefund(record, record['状态']); break;
      case '财务-退款': await this.maybeRefund(record, record['状态']); break;
      case '财务-消耗': await this.applyConsumption({}, record, false); break;
      default: break;
    }
  }

  async afterUpdate(
    tableKey: string,
    oldRecord: any,
    newFields: Record<string, any>,
  ): Promise<void> {
    if (!LINKAGE_TABLES.has(tableKey)) return;
    if (tableKey === '财务-消耗') {
      const merged = { ...oldRecord, ...newFields };
      await this.applyConsumption(oldRecord, merged, false);
      return;
    }
    if (!this.isStatusTable(tableKey)) return;
    const oldStatus = toText(oldRecord['状态']);
    const newStatus = newFields['状态'] !== undefined ? toText(newFields['状态']) : oldStatus;
    if (!this.isTerminal(tableKey, newStatus) || this.isTerminal(tableKey, oldStatus)) return;
    const merged = { ...oldRecord, ...newFields };
    switch (tableKey) {
      case '财务-充值': await this.maybeRecharge(merged, newStatus); break;
      case '财务-扣减': await this.maybeDeduct(merged, newStatus); break;
      case '财务-后返': await this.maybeRebate(merged, newStatus); break;
      case '财务-退币': await this.maybeCoinRefund(merged, newStatus); break;
      case '财务-退款': await this.maybeRefund(merged, newStatus); break;
    }
  }

  async afterRemove(tableKey: string, record: any): Promise<void> {
    if (!LINKAGE_TABLES.has(tableKey)) return;
    if (tableKey === '财务-消耗') {
      await this.applyConsumption(record, record, true);
    }
  }

  /** ==================== 各单据触发 ==================== */

  private async maybeRecharge(record: any, status: unknown): Promise<void> {
    if (!this.isTerminal('财务-充值', status)) return;
    const grant = num(record['赠款金额']);
    const recharge = num(record['充值金额']);
    const actual = num(record['到账金额']);
    const income = actual || recharge + grant;
    const { record: account } = await this.findAccount(record['端口']);
    await this.applyDeltaAndFlow(
      account,
      { recharge, balance: recharge, grant },
      {
        customerName: toText(record['客户名称']),
        entityName: toText(record['主体名称']),
        txType: '充值',
        incomeAmount: income,
        remark: `自动联动:充值#${toText(record['充值编号'])}`,
        createdAt: toText(record['充值时间']) || nowIso(),
      },
    );
  }

  private async maybeDeduct(record: any, status: unknown): Promise<void> {
    if (!this.isTerminal('财务-扣减', status)) return;
    const amt = num(record['扣减金额']);
    const { record: account } = await this.findAccount(record['端口']);
    await this.applyDeltaAndFlow(
      account,
      { consume: amt, balance: -amt },
      {
        customerName: toText(record['客户名称']),
        entityName: toText(record['主体名称']),
        txType: '扣减',
        expenseAmount: amt,
        remark: `自动联动:扣减#${toText(record['扣减编号'])}`,
        createdAt: nowIso(),
      },
    );
  }

  private async maybeRebate(record: any, status: unknown): Promise<void> {
    if (!this.isTerminal('财务-后返', status)) return;
    const amt = num(record['返点金额']);
    const { record: account } = await this.findAccount(record['端口']);
    await this.applyDeltaAndFlow(
      account,
      { grant: amt },
      {
        customerName: toText(record['客户名称']),
        entityName: toText(record['主体名称']),
        txType: '返点',
        incomeAmount: amt,
        remark: `自动联动:后返#${toText(record['后返编号'])}`,
        createdAt: nowIso(),
      },
    );
  }

  private async maybeCoinRefund(record: any, status: unknown): Promise<void> {
    if (!this.isTerminal('财务-退币', status)) return;
    const amt = num(record['退币金额']);
    const { record: account } = await this.findAccount(record['端口']);
    await this.applyDeltaAndFlow(
      account,
      { balance: amt },
      {
        customerName: toText(record['客户名称']),
        entityName: toText(record['主体名称']),
        txType: '退币',
        incomeAmount: amt,
        remark: `自动联动:退币#${toText(record['退币编号'])}`,
        createdAt: nowIso(),
      },
    );
  }

  /** 退款表无端口字段：不更新账户，仅写流水留痕 */
  private async maybeRefund(record: any, status: unknown): Promise<void> {
    if (!this.isTerminal('财务-退款', status)) return;
    const no = toText(record['退款编号']);
    this.logger.warn(`退款单无端口字段，仅写流水不联动账户：${no}`);
    await this.createFlowWithRetry({
      customerName: toText(record['客户名称']),
      entityName: toText(record['主体名称']),
      txType: '退款',
      expenseAmount: num(record['退款金额']),
      remark: `自动联动:退款#${no}(退款单无端口,未联动账户)`,
      createdAt: nowIso(),
    });
  }

  /** 消耗：新建/更新差额/删除冲正 */
  private async applyConsumption(oldRecord: any, newRecord: any, isDelete: boolean): Promise<void> {
    const oldPort = this.normalizePort(toText(oldRecord['端口']));
    const newPort = this.normalizePort(toText(newRecord['端口']));
    const oldAmt = num(oldRecord['消耗金额']);
    const newAmt = num(newRecord['消耗金额']);
    const oldCash = num(oldRecord['现金消耗']) || oldAmt;
    const newCash = num(newRecord['现金消耗']) || newAmt;
    const oldGrant = num(oldRecord['赠款消耗']);
    const newGrant = num(newRecord['赠款消耗']);

    const reverse: AccountDelta = { consume: -oldAmt, balance: oldCash, grant: oldGrant };
    const forward: AccountDelta = isDelete
      ? { consume: 0, balance: 0, grant: 0 }
      : { consume: newAmt, balance: -newCash, grant: -newGrant };

    if (oldPort === newPort) {
      const net: AccountDelta = {
        consume: (forward.consume ?? 0) + (reverse.consume ?? 0),
        balance: (forward.balance ?? 0) + (reverse.balance ?? 0),
        grant: (forward.grant ?? 0) + (reverse.grant ?? 0),
      };
      if (!net.consume && !net.balance && !net.grant) return;
      const { record: account } = await this.findAccount(oldRecord['端口']);
      const prev = await this.applyAccountDelta(account, net);
      if (isDelete) {
        await this.createFlowOrRollback(
          {
            customerName: toText(oldRecord['客户名称']),
            entityName: toText(oldRecord['主体名称']),
            txType: '消耗',
            expenseAmount: -oldAmt,
            remark: `删除冲正#${toText(oldRecord['消耗编号'])}`,
            createdAt: nowIso(),
          },
          prev.balance + (net.balance ?? 0),
          account._id,
          prev,
        );
      }
      return;
    }

    // 端口变更：旧端口反向冲回，新端口正向（删除时仅冲回旧端口）
    if (oldPort) {
      const { record: accOld } = await this.findAccount(oldRecord['端口']);
      await this.applyAccountDelta(accOld, reverse);
    }
    if (!isDelete && newPort) {
      const { record: accNew } = await this.findAccount(newRecord['端口']);
      await this.applyAccountDelta(accNew, forward);
    }
  }

  /** ==================== 账户 + 流水可补偿序列 ==================== */

  private async applyDeltaAndFlow(account: any, delta: AccountDelta, draft: FlowDraft): Promise<void> {
    const flows = await this.listAll(FLOW_TABLE);
    if (this.flowExists(flows, draft)) {
      this.logger.log(`流水已存在，跳过联动：${draft.remark}`);
      return;
    }
    const prev = await this.applyAccountDelta(account, delta);
    const balanceSnapshot = prev.balance + (delta.balance ?? 0);
    await this.createFlowOrRollback(draft, balanceSnapshot, account._id, prev);
  }

  private flowExists(flows: any[], draft: FlowDraft): boolean {
    return flows.some(
      (f) => toText(f['备注']) === draft.remark && toText(f['交易类型']) === draft.txType,
    );
  }

  /** 先改账户 → 再写流水；流水失败则反向回滚账户并抛错，绝不留半成品 */
  private async createFlowOrRollback(
    draft: FlowDraft,
    balanceSnapshot: number,
    accountId: string,
    prev: AccountSnapshot,
  ): Promise<void> {
    try {
      await this.createFlowWithRetry(draft, balanceSnapshot);
    } catch (e: any) {
      await this.restoreAccount(accountId, prev);
      this.logger.error(`流水创建失败，已回滚账户 ${accountId}: ${e?.message || e}`);
      throw new BadRequestException(`资金联动失败：${draft.txType}流水写入失败，账户变更已回滚（${e?.message || e}）`);
    }
  }

  private async createFlowWithRetry(draft: FlowDraft, balanceSnapshot?: number): Promise<void> {
    const flows = await this.listAll(FLOW_TABLE);
    if (this.flowExists(flows, draft)) return;
    const seq = this.nextSerial(flows);
    const year = new Date().getFullYear();
    let attempt = 0;
    while (attempt <= 2) {
      const serialNo = `LS${year}${String(seq + attempt + 1).padStart(4, '0')}`;
      const fields: Record<string, any> = {
        '流水编号': serialNo,
        '客户名称': draft.customerName,
        '主体名称': draft.entityName ?? '',
        '交易类型': draft.txType,
        '收入金额': draft.incomeAmount ?? 0,
        '支出金额': draft.expenseAmount ?? 0,
        '备注': draft.remark,
        '交易时间': draft.createdAt || nowIso(),
      };
      if (balanceSnapshot !== undefined) fields['账户余额'] = balanceSnapshot;
      try {
        await this.entity.create(FLOW_TABLE, fields);
        return;
      } catch (e: any) {
        this.logger.warn(`流水创建失败（第 ${attempt + 1} 次）：${e?.message || e}`);
        attempt += 1;
      }
    }
    throw new BadRequestException('流水创建失败，已超出最大重试次数');
  }

  private async applyAccountDelta(account: any, delta: AccountDelta): Promise<AccountSnapshot> {
    const prev: AccountSnapshot = {
      total_recharge: num(account['累计充值']),
      total_consume: num(account['累计消耗']),
      balance: num(account['账户余额']),
      grant: num(account['赠款余额']),
    };
    await this.entity.update(PORT_ACCOUNT_TABLE, account._id, {
      '累计充值': prev.total_recharge + (delta.recharge ?? 0),
      '累计消耗': prev.total_consume + (delta.consume ?? 0),
      '账户余额': prev.balance + (delta.balance ?? 0),
      '赠款余额': prev.grant + (delta.grant ?? 0),
      '更新时间': nowIso(),
    });
    return prev;
  }

  private async restoreAccount(accountId: string, prev: AccountSnapshot): Promise<void> {
    await this.entity.update(PORT_ACCOUNT_TABLE, accountId, {
      '累计充值': prev.total_recharge,
      '累计消耗': prev.total_consume,
      '账户余额': prev.balance,
      '赠款余额': prev.grant,
      '更新时间': nowIso(),
    });
  }

  /** ==================== 工具 ==================== */

  private async listAll(tableKey: string): Promise<any[]> {
    const items: any[] = [];
    let token: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const r = await this.entity.list(tableKey, { pageSize: 200, pageToken: token });
      items.push(...r.items);
      token = r.nextPageToken || undefined;
      hasMore = !!token;
    }
    return items;
  }

  private nextSerial(flows: any[]): number {
    const numbers = flows
      .map((f) => {
        const m = toText(f['流水编号']).match(/^LS\d{4}(\d+)$/);
        return m ? Number(m[1]) : 0;
      })
      .filter((n) => n > 0);
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }

  /** ==================== 余额重算（两阶段：先纯内存聚合后提交，幂等不写流水） ==================== */

  async recalcAllPortBalances(): Promise<RecalcBalancesResult> {
    // ---- 阶段一：纯内存聚合，禁止任何写库；此阶段任何异常直接抛出，账户原值不动 ----
    const accounts = await this.listAll(PORT_ACCOUNT_TABLE);
    const counted = { 充值: 0, 消耗: 0, 扣减: 0, 后返: 0, 退币: 0 };
    const totals = new Map<string, { recharge: number; consume: number; balance: number; grant: number }>();
    const unmatched = new Map<string, UnmatchedPort>();
    const pickedByPort = new Map<string, string | null>();

    const bucketOf = (portRaw: unknown): string | null => {
      const raw = toText(portRaw);
      const port = this.normalizePort(raw);
      if (pickedByPort.has(port)) return pickedByPort.get(port) ?? null;
      const picked = this.pickAccount(accounts, raw);
      const id = picked ? picked.id : null;
      pickedByPort.set(port, id);
      if (!id) {
        unmatched.set(port, { 端口原值: raw, 归一值: port, 单据数: 0 });
      }
      return id;
    };

    const addTo = (id: string, key: 'recharge' | 'consume' | 'balance' | 'grant', delta: number) => {
      let s = totals.get(id);
      if (!s) {
        s = { recharge: 0, consume: 0, balance: 0, grant: 0 };
        totals.set(id, s);
      }
      s[key] += delta;
    };

    for (const r of await this.listAll('财务-充值')) {
      if (!this.isTerminal('财务-充值', r['状态'])) continue;
      const recharge = this.numSafe('财务-充值', r._id, '充值金额', r['充值金额']);
      const grant = this.numSafe('财务-充值', r._id, '赠款金额', r['赠款金额']);
      const id = bucketOf(r['端口']);
      if (!id) {
        const e = unmatched.get(this.normalizePort(toText(r['端口'])));
        if (e) e.单据数 += 1;
        continue;
      }
      addTo(id, 'recharge', recharge);
      addTo(id, 'balance', recharge);
      addTo(id, 'grant', grant);
      counted['充值'] += 1;
    }

    for (const r of await this.listAll('财务-消耗')) {
      const amt = this.numSafe('财务-消耗', r._id, '消耗金额', r['消耗金额']);
      const cash = this.numSafe('财务-消耗', r._id, '现金消耗', r['现金消耗']) || amt;
      const grantConsume = this.numSafe('财务-消耗', r._id, '赠款消耗', r['赠款消耗']);
      const id = bucketOf(r['端口']);
      if (!id) {
        const e = unmatched.get(this.normalizePort(toText(r['端口'])));
        if (e) e.单据数 += 1;
        continue;
      }
      addTo(id, 'consume', amt);
      addTo(id, 'balance', -cash);
      addTo(id, 'grant', -grantConsume);
      counted['消耗'] += 1;
    }

    for (const r of await this.listAll('财务-扣减')) {
      if (!this.isTerminal('财务-扣减', r['状态'])) continue;
      const amt = this.numSafe('财务-扣减', r._id, '扣减金额', r['扣减金额']);
      const id = bucketOf(r['端口']);
      if (!id) {
        const e = unmatched.get(this.normalizePort(toText(r['端口'])));
        if (e) e.单据数 += 1;
        continue;
      }
      addTo(id, 'consume', amt);
      addTo(id, 'balance', -amt);
      counted['扣减'] += 1;
    }

    for (const r of await this.listAll('财务-后返')) {
      if (!this.isTerminal('财务-后返', r['状态'])) continue;
      const amt = this.numSafe('财务-后返', r._id, '返点金额', r['返点金额']);
      const id = bucketOf(r['端口']);
      if (!id) {
        const e = unmatched.get(this.normalizePort(toText(r['端口'])));
        if (e) e.单据数 += 1;
        continue;
      }
      addTo(id, 'grant', amt);
      counted['后返'] += 1;
    }

    for (const r of await this.listAll('财务-退币')) {
      if (!this.isTerminal('财务-退币', r['状态'])) continue;
      const amt = this.numSafe('财务-退币', r._id, '退币金额', r['退币金额']);
      const id = bucketOf(r['端口']);
      if (!id) {
        const e = unmatched.get(this.normalizePort(toText(r['端口'])));
        if (e) e.单据数 += 1;
        continue;
      }
      addTo(id, 'balance', amt);
      counted['退币'] += 1;
    }

    // 退款不参与账户重算（无端口字段，仅流水留痕）

    if (unmatched.size > 0) {
      this.logger.warn(
        `余额重算存在未匹配端口 ${unmatched.size} 个（不影响其余端口）：${JSON.stringify([...unmatched.values()])}`,
      );
    }

    const zeroSnapshot = (): RecalcBalanceSnapshot => ({
      累计充值: 0,
      累计消耗: 0,
      账户余额: 0,
      赠款余额: 0,
    });

    // 全部账户的目标值：被选中且有明细的取聚合值，其余（未选中重复/无明细命中）为 0
    const targets = new Map<string, RecalcBalanceSnapshot>();
    for (const acc of accounts) {
      const id = String(acc._id ?? '');
      const t = totals.get(id);
      targets.set(
        id,
        t
          ? { 累计充值: t.recharge, 累计消耗: t.consume, 账户余额: t.balance, 赠款余额: t.grant }
          : zeroSnapshot(),
      );
    }

    // ---- 阶段二：提交（仅当阶段一无异常才到达这里）；逐账户写目标值，失败收集后继续 ----
    const now = nowIso();
    const succeeded: string[] = [];
    const failed: { id: string; port: string; reason: string }[] = [];
    for (const [id, target] of targets) {
      const acc = accounts.find((a) => String(a._id ?? '') === id);
      try {
        await this.entity.update(PORT_ACCOUNT_TABLE, id, {
          '累计充值': target.累计充值,
          '累计消耗': target.累计消耗,
          '账户余额': target.账户余额,
          '赠款余额': target.赠款余额,
          '更新时间': now,
        });
        succeeded.push(id);
      } catch (e: any) {
        failed.push({
          id,
          port: acc ? toText(acc['端口名称']) : id,
          reason: e?.message || String(e),
        });
      }
    }

    if (failed.length > 0) {
      throw new BadRequestException(
        `余额重算提交部分失败：成功 ${succeeded.length} 个（${succeeded.join(', ')}），失败 ${failed.length} 个（${failed
          .map((f) => `${f.port}[${f.id}]: ${f.reason}`)
          .join('; ')}）。目标值已在内存算定，重试本接口可补齐失败账户`,
      );
    }

    const ports: RecalcPortResult[] = accounts.map((acc) => {
      const id = String(acc._id ?? '');
      const before: RecalcBalanceSnapshot = {
        累计充值: num(acc['累计充值']),
        累计消耗: num(acc['累计消耗']),
        账户余额: num(acc['账户余额']),
        赠款余额: num(acc['赠款余额']),
      };
      const after = targets.get(id) ?? zeroSnapshot();
      const changed =
        Math.abs(before.累计充值 - after.累计充值) > 0.005 ||
        Math.abs(before.累计消耗 - after.累计消耗) > 0.005 ||
        Math.abs(before.账户余额 - after.账户余额) > 0.005 ||
        Math.abs(before.赠款余额 - after.赠款余额) > 0.005;
      return {
        端口名称: toText(acc['端口名称']),
        端口账户_id: id,
        是否选中: totals.has(id),
        重算前: before,
        重算后: after,
        是否变化: changed,
      };
    });

    this.logger.log(
      `余额重算完成，共校正 ${totals.size}/${accounts.length} 个端口账户，计入单据 ${JSON.stringify(counted)}，未匹配端口 ${unmatched.size} 个`,
    );
    return {
      ports,
      summary: {
        port_count: accounts.length,
        recalculated: totals.size,
        counted,
        unmatched_ports: [...unmatched.values()],
      },
    };
  }
}
