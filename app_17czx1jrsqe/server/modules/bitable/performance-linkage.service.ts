import { Injectable, Logger } from '@nestjs/common';
import { BitableEntityService } from './bitable.entity.service';
import { BitableService } from '../../common/feishu/bitable.service';
import { getTableId } from '../../config/feishu.config';
import {
  calcPayrollStructure,
  calcScores,
  gradeOf,
  numOrNull,
  parseMetricDetail,
  PAYROLL_CONSTANTS,
  round2,
  toNum,
  type PayrollPreview,
  type PerfMetricDetail,
} from '@shared/performance-calc';

const PERF_TABLE = '人资-绩效考核';
const EMP_TABLE = '人资-员工档案';
const SALARY_TABLE = '人资-薪酬工资';

const PERF_NEW_FIELDS: Array<[string, number]> = [
  ['结果分', 2],
  ['管理分', 2],
  ['增值加分', 2],
  ['制约扣分', 2],
  ['自评分', 2],
  ['上级评分', 2],
  ['出勤天数', 2],
  ['指标明细', 1],
  ['绩效工资标准快照', 2],
  ['核算绩效工资', 2],
  ['基本工资快照', 2],
  ['提成快照', 2],
];
const EMP_NEW_FIELDS: Array<[string, number]> = [['绩效工资标准', 2]];
const SALARY_NEW_FIELDS: Array<[string, number]> = [
  ['提成', 2],
  ['应发工资', 2],
  ['社保扣款', 2],
  ['公积金', 2],
  ['应纳税所得额', 2],
  ['个税', 2],
];

export interface PayrollLinkResult {
  ok: boolean;
  employee: string;
  reason?: string;
  perfSalary?: number;
  actualSalary?: number;
}

export interface RecalcPayrollResult {
  month: string;
  updated: number;
  skipped: Array<{ 员工: string; 原因: string }>;
}

function toText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v !== null && 'name' in v) {
    return String((v as Record<string, unknown>).name ?? '');
  }
  return String(v);
}

function isConfirmed(v: unknown): boolean {
  return ['confirmed', '已确认'].includes(toText(v));
}

@Injectable()
export class PerformanceLinkageService {
  private readonly logger = new Logger(PerformanceLinkageService.name);
  private fieldsEnsured = false;

  constructor(
    private readonly entity: BitableEntityService,
    private readonly bitable: BitableService,
  ) {}

  isLinkageTable(tableKey: string): boolean {
    return tableKey === PERF_TABLE;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureFields();
  }

  private async ensureFields(): Promise<void> {
    if (this.fieldsEnsured) return;
    const targets: Array<[string, Array<[string, number]>]> = [
      [PERF_TABLE, PERF_NEW_FIELDS],
      [EMP_TABLE, EMP_NEW_FIELDS],
      [SALARY_TABLE, SALARY_NEW_FIELDS],
    ];
    for (const [tableKey, fields] of targets) {
      try {
        const tableId = getTableId(tableKey);
        const existing = await this.listFieldNames(tableId);
        for (const [name, type] of fields) {
          if (existing.includes(name)) continue;
          await this.bitable.createField(tableId, { field_name: name, type });
          this.logger.log(`已补建 ${tableKey} 字段「${name}」`);
        }
      } catch (err) {
        this.logger.warn(
          `补建 ${tableKey} 绩效字段失败（不阻断联动）: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    this.fieldsEnsured = true;
  }

  async afterCreate(tableKey: string, record: any): Promise<void> {
    if (!this.isLinkageTable(tableKey)) return;
    await this.ensureFields();
    if (!isConfirmed(record?.['绩效状态'])) return;
    const r = await this.applyPayroll(record as Record<string, unknown>);
    this.logResult('创建', r);
  }

  async afterUpdate(tableKey: string, oldRecord: any, fields: Record<string, unknown>): Promise<void> {
    if (!this.isLinkageTable(tableKey)) return;
    await this.ensureFields();
    const oldStatus = oldRecord?.['绩效状态'];
    const newStatus = fields['绩效状态'] !== undefined ? fields['绩效状态'] : oldStatus;
    const merged: Record<string, unknown> = { ...(oldRecord || {}), ...fields };
    if (isConfirmed(newStatus)) {
      const r = await this.applyPayroll(merged);
      this.logResult('更新', r);
      return;
    }
    if (isConfirmed(oldStatus)) {
      const r = await this.restorePayroll(merged);
      this.logResult('回退', r);
    }
  }

  async afterRemove(tableKey: string, record: any): Promise<void> {
    if (!this.isLinkageTable(tableKey)) return;
    await this.ensureFields();
    if (!isConfirmed(record?.['绩效状态'])) return;
    const r = await this.restorePayroll(record as Record<string, unknown>);
    this.logResult('删除', r);
  }

  async recalcPayroll(month: string): Promise<RecalcPayrollResult> {
    await this.ensureFields();
    const records = await this.listAll(PERF_TABLE);
    const skipped: Array<{ 员工: string; 原因: string }> = [];
    let updated = 0;
    for (const rec of records) {
      const employee = toText(rec['员工姓名']);
      if (toText(rec['考核周期']) !== month) continue;
      if (!isConfirmed(rec['绩效状态'])) {
        skipped.push({ 员工: employee, 原因: '绩效状态非已确认' });
        continue;
      }
      const r = await this.applyPayroll(rec as Record<string, unknown>);
      if (r.ok) {
        updated += 1;
      } else {
        skipped.push({ 员工: employee, 原因: r.reason || '联动失败' });
      }
    }
    return { month, updated, skipped };
  }

  private logResult(action: string, r: PayrollLinkResult): void {
    if (r.ok) {
      this.logger.log(
        `绩效工资联动[${action}] ${r.employee}: 绩效=${r.perfSalary ?? 0} 实发=${r.actualSalary ?? 0}`,
      );
    } else {
      this.logger.warn(`绩效工资联动[${action}] ${r.employee} 未生效: ${r.reason}`);
    }
  }

  /** 确认态：按指标明细/上级评分重算总分，并覆盖工资单绩效工资与实发工资 */
  private async applyPayroll(record: Record<string, unknown>): Promise<PayrollLinkResult> {
    const employee = toText(record['员工姓名']);
    const period = toText(record['考核周期']);
    if (!employee || !period) return { ok: false, employee, reason: '缺员工姓名或考核周期' };

    const detail: PerfMetricDetail | null = parseMetricDetail(record['指标明细']);
    const superior = numOrNull(record['上级评分']);
    let total: number;
    if (detail) {
      total = calcScores(detail, superior).total;
    } else {
      const stored = numOrNull(record['考核得分']);
      if (stored === null) return { ok: false, employee, reason: '缺指标明细且缺考核得分' };
      total = round2(stored);
    }

    const salary = await this.findSalaryRecord(employee, period);
    if (!salary) return { ok: false, employee, reason: '未找到该员工当月工资单，未联动工资' };

    // 弹窗确认时带入的基本工资/提成快照优先（用户可手改），否则用工资单既有值
    const base = numOrNull(record['基本工资快照']) ?? toNum(salary['基本工资']);
    const commission = numOrNull(record['提成快照']) ?? toNum(salary['提成']);
    const structure = calcPayrollStructure({
      baseSalary: base,
      commission,
      allowance: toNum(salary['补贴']),
      otherDeduction: toNum(salary['扣款']),
      totalScore: total,
    });
    const salaryId = this.recordId(salary);
    if (!salaryId) return { ok: false, employee, reason: '工资单记录ID缺失' };
    await this.entity.update(SALARY_TABLE, salaryId, {
      基本工资: base,
      提成: commission,
      绩效工资: structure.perfSalary,
      应发工资: structure.gross,
      社保扣款: structure.social,
      公积金: structure.fund,
      应纳税所得额: structure.taxable,
      个税: structure.tax,
      实发工资: structure.net,
    });
    const recId = this.recordId(record);
    if (recId) {
      try {
        await this.entity.update(PERF_TABLE, recId, {
          考核得分: total,
          绩效等级: gradeOf(total),
          核算绩效工资: structure.perfSalary,
          绩效工资标准快照: round2(base * PAYROLL_CONSTANTS.PERF_RATIO),
          基本工资快照: base,
          提成快照: commission,
        });
      } catch (err) {
        this.logger.warn(
          `回写考核核算绩效工资失败（不阻断联动）: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { ok: true, employee, perfSalary: structure.perfSalary, actualSalary: structure.net };
  }

  /** 回退/删除已确认考核：绩效工资恢复为标准满额（无标准按0），实发同步重算 */
  private async restorePayroll(record: Record<string, unknown>): Promise<PayrollLinkResult> {
    const employee = toText(record['员工姓名']);
    const period = toText(record['考核周期']);
    if (!employee || !period) return { ok: false, employee, reason: '缺员工姓名或考核周期' };

    const salary = await this.findSalaryRecord(employee, period);
    if (!salary) return { ok: false, employee, reason: '未找到该员工当月工资单，无需恢复' };

    const profileStd = await this.getProfileStandard(employee);
    const snapshot = numOrNull(record['绩效工资标准快照']);
    const base = toNum(salary['基本工资']);
    const std =
      profileStd !== null
        ? profileStd
        : snapshot !== null
          ? snapshot
          : round2(base * PAYROLL_CONSTANTS.PERF_RATIO);
    const structure = calcPayrollStructure({
      baseSalary: base,
      commission: toNum(salary['提成']),
      allowance: toNum(salary['补贴']),
      otherDeduction: toNum(salary['扣款']),
      totalScore: 100,
      perfSalaryOverride: std,
    });
    const salaryId = this.recordId(salary);
    if (!salaryId) return { ok: false, employee, reason: '工资单记录ID缺失' };
    await this.entity.update(SALARY_TABLE, salaryId, {
      绩效工资: structure.perfSalary,
      应发工资: structure.gross,
      社保扣款: structure.social,
      公积金: structure.fund,
      应纳税所得额: structure.taxable,
      个税: structure.tax,
      实发工资: structure.net,
    });
    return { ok: true, employee, perfSalary: structure.perfSalary, actualSalary: structure.net };
  }

  /**
   * 薪资预览（弹窗实时取数）：与确认联动同一 calcPayrollStructure 口径。
   * 找不到当月工资单时 foundPayroll=false、金额按 0 返回，不抛错。
   */
  async payrollPreview(employee: string, period: string, totalScore: number): Promise<PayrollPreview> {
    const salary = await this.findSalaryRecord(employee, period);
    const baseSalary = salary ? toNum(salary['基本工资']) : 0;
    const commission = salary ? toNum(salary['提成']) : 0;
    const allowance = salary ? toNum(salary['补贴']) : 0;
    const deduction = salary ? toNum(salary['扣款']) : 0;
    return {
      baseSalary,
      commission,
      allowance,
      deduction,
      structure: calcPayrollStructure({
        baseSalary,
        commission,
        allowance,
        otherDeduction: deduction,
        totalScore,
      }),
      foundPayroll: salary !== null,
    };
  }

  private async getProfileStandard(employee: string): Promise<number | null> {
    const records = await this.listAll(EMP_TABLE);
    const hit = records.find((r: Record<string, unknown>) => toText(r['姓名']) === employee);
    if (!hit) return null;
    return numOrNull(hit['绩效工资标准']);
  }

  private async findSalaryRecord(
    employee: string,
    month: string,
  ): Promise<Record<string, unknown> | null> {
    const records = await this.listAll(SALARY_TABLE);
    return (
      records.find(
        (r: Record<string, unknown>) =>
          toText(r['员工姓名']) === employee && toText(r['薪资月份']) === month,
      ) || null
    );
  }

  private async listAll(tableKey: string): Promise<Array<Record<string, unknown>>> {
    const all: Array<Record<string, unknown>> = [];
    for (let page = 1; page <= 50; page += 1) {
      const res = await this.entity.list(tableKey, { page, pageSize: 200 });
      const items = (res as { items?: Array<Record<string, unknown>> }).items || [];
      all.push(...items);
      if (items.length < 200) break;
    }
    return all;
  }

  private async listFieldNames(tableId: string): Promise<string[]> {
    const res: unknown = await this.bitable.listFields(tableId);
    const items: Array<{ field_name?: string }> = Array.isArray(res)
      ? (res as Array<{ field_name?: string }>)
      : (((res as { data?: { items?: Array<{ field_name?: string }> } })?.data?.items || []) as Array<{
          field_name?: string;
        }>);
    return items.map((f) => String(f?.field_name || ''));
  }

  private recordId(record: Record<string, unknown>): string {
    return String(record['_id'] || record['record_id'] || '');
  }
}
