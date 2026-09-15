// 报表中心: 从 68 表配置派生可选维度/指标, 执行实时聚合, 以及模板 / 推送配置的本地持久化
import { MODULES } from '@/config/modules';
import type { ModuleKey, IBizRecord } from '@/data/mt-records';
import { groupCount, groupSum, monthly, recentMonths } from './analytics';
import { loadModuleRecords, createModuleRecord, updateModuleRecord } from './data-service';

export type ChartType = 'bar' | 'hbar' | 'pie' | 'line' | 'table' | 'kpi';
export type SortMode = 'desc' | 'asc' | 'name';

export interface IMeasure {
  label: string;
  count: boolean; // true = 记录数
}
export interface ReportSource {
  key: string;
  label: string;
  groupLabel: string;
  dimensions: string[]; // 可分组的单选列(中文 label)
  measures: IMeasure[]; // 指标(记录数 + 数值列)
  dateFields: string[]; // 可按月趋势的日期列
}

/** 维度下拉项: 普通分组维度, 以及「按月·日期字段」趋势维度 */
export interface DimOption {
  value: string; // 普通维度即 label; 按月维度为 `month::日期label`
  label: string;
  monthly: boolean;
}

const GROUP_LABEL: Record<string, string> = {
  customer: '客户管理',
  ad: '广告业务',
  video: '视频业务',
  contract: '合同业务',
  finance: '财务管理',
  hr: '人资管理',
  admin: '行政管理',
  task: '任务中心',
  system: '系统管理',
  support: '业务支持',
};

export function buildSources(): ReportSource[] {
  return Object.values(MODULES).map((m) => {
    const dimensions = m.fields.filter((f) => f.type === 'select').map((f) => f.label);
    const numberFields = m.fields.filter((f) => f.type === 'number').map((f) => f.label);
    const dateFields = m.fields.filter((f) => f.type === 'date').map((f) => f.label);
    return {
      key: m.key,
      label: `${m.label} · ${m.noun}`,
      groupLabel: GROUP_LABEL[m.key] ?? m.label,
      dimensions,
      measures: [{ label: '记录数', count: true }, ...numberFields.map((label) => ({ label, count: false }))],
      dateFields,
    };
  });
}

export function dimOptions(source: ReportSource | undefined): DimOption[] {
  if (!source) return [];
  const groups = source.dimensions.map((d) => ({ value: d, label: d, monthly: false }));
  const months = source.dateFields.map((d) => ({ value: `month::${d}`, label: `按月趋势 · ${d}`, monthly: true }));
  return [...groups, ...months];
}

export function isMonthlyDim(dim: string): boolean {
  return dim.startsWith('month::');
}
export function monthlyField(dim: string): string {
  return dim.replace('month::', '');
}

export interface AggResult {
  data: { name: string; value: number }[];
  total: number;
}

/** 按配置执行聚合 */
export function aggregate(
  rows: IBizRecord[],
  sourceKey: string,
  dim: string,
  measure: IMeasure,
  sort: SortMode,
  topN: number | 'all',
): AggResult {
  let data: { name: string; value: number }[];
  if (isMonthlyDim(dim)) {
    const months = recentMonths(12);
    const field = monthlyField(dim);
    const vals = measure.count
      ? monthly(rows, sourceKey, field, months)
      : monthly(rows, sourceKey, field, months, measure.label);
    data = months.map((name, i) => ({ name, value: vals[i] }));
  } else {
    data = measure.count
      ? groupCount(rows, sourceKey, dim, false)
      : groupSum(rows, sourceKey, dim, measure.label);
    if (sort === 'name') data = [...data].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    else if (sort === 'asc') data = [...data].sort((a, b) => a.value - b.value);
    else data = [...data].sort((a, b) => b.value - a.value);
    if (topN !== 'all') data = data.slice(0, topN);
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return { data, total: Math.round(total * 100) / 100 };
}

/** 导出 CSV(纯前端下载) */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((r) => r.map(escape).join(','));
  const blob = new Blob([`${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------- 报表模板 ---------------------- */
export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  scope: '个人' | '部门' | '全员' | '管理层';
  source: string;
  dim: string;
  measure: string; // 指标 label
  chartType: ChartType;
  topN: number | 'all';
  sort: SortMode;
  preset?: boolean;
  createdAt: number;
  uses: number;
}

/** 手册 25.2 预设的 10 张常用报表(字段均取自真实数据表) */
export const PRESET_TEMPLATES: ReportTemplate[] = [
  { id: 'pt-daily', name: '经营日报', category: '经营分析', scope: '全员', source: 'adCost', dim: 'month::消耗日期', measure: '消耗金额', chartType: 'line', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-weekcost', name: '消耗周报', category: '广告分析', scope: '全员', source: 'adCost', dim: '新投放端口', measure: '消耗金额', chartType: 'bar', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-monthfin', name: '月度财务报表', category: '财务分析', scope: '全员', source: 'income', dim: 'month::收入时间', measure: '收入金额', chartType: 'line', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-perfrank', name: '商务业绩排行', category: '合同分析', scope: '部门', source: 'contract', dim: '所属部门', measure: '合同金额', chartType: 'hbar', topN: 10, sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-costana', name: '客户消耗分析', category: '广告分析', scope: '全员', source: 'ad', dim: '投放端口', measure: '累计消耗', chartType: 'hbar', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-portcash', name: '端口现金消耗', category: '广告分析', scope: '全员', source: 'adCost', dim: '新投放端口', measure: '现金消耗', chartType: 'pie', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-roi', name: '行业ROI分析', category: '行业分析', scope: '管理层', source: 'industryRoi', dim: '一级行业', measure: '平均ROI', chartType: 'bar', topN: 10, sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-receive', name: '应收账款账龄分析', category: '财务分析', scope: '部门', source: 'finance', dim: '收款状态', measure: '收款金额', chartType: 'pie', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-videocost', name: '视频项目成本分析', category: '视频分析', scope: '全员', source: 'video', dim: '项目状态', measure: '项目预算', chartType: 'bar', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
  { id: 'pt-hrmonth', name: '人资月度报表', category: '人资分析', scope: '部门', source: 'hr', dim: 'month::入职日期', measure: '记录数', chartType: 'line', topN: 'all', sort: 'desc', preset: true, createdAt: 0, uses: 0 },
];

/** 图表类型 code ↔ 多维表格中文枚举 */
const CHART_TO_LABEL: Record<ChartType, string> = {
  bar: '柱状图', hbar: '条形图', pie: '饼图', line: '折线图', table: '数据表', kpi: '指标卡',
};
const CHART_FROM_LABEL: Record<string, ChartType> = Object.fromEntries(
  Object.entries(CHART_TO_LABEL).map(([k, v]) => [v, k as ChartType]),
);
const str = (v: unknown): string => (typeof v === 'number' ? String(v) : (v as string) ?? '');

/** 从多维表格「报表模板」表实时读取用户自定义模板(软删除的不返回) */
export async function fetchCustomTemplates(): Promise<ReportTemplate[]> {
  const recs = await loadModuleRecords('reportTpl', true);
  return recs
    .filter((r) => str(r.values.rowState) !== '已删除')
    .map((r) => {
      const v = r.values;
      const topRaw = str(v.topN);
      return {
        id: r.recordId,
        name: str(v.name),
        category: str(v.category) || '我的报表',
        scope: (str(v.scope) || '个人') as ReportTemplate['scope'],
        source: str(v.source),
        dim: str(v.dim),
        measure: str(v.measure),
        chartType: CHART_FROM_LABEL[str(v.chart)] ?? 'bar',
        topN: topRaw === 'all' || topRaw === '' ? 'all' : Number(topRaw),
        sort: (str(v.sort) || 'desc') as SortMode,
        preset: false,
        createdAt: 0,
        uses: 0,
      };
    });
}
/** 新建自定义模板并实时写入多维表格, 返回带记录 ID 的模板 */
export async function createCustomTemplate(
  input: Omit<ReportTemplate, 'id' | 'preset' | 'createdAt' | 'uses'>,
): Promise<ReportTemplate> {
  const rec = await createModuleRecord('reportTpl', {
    name: input.name,
    category: input.category || '我的报表',
    scope: input.scope,
    source: input.source,
    dim: input.dim,
    measure: input.measure,
    chart: CHART_TO_LABEL[input.chartType],
    topN: String(input.topN),
    sort: input.sort,
    status: '启用',
    rowState: '正常',
  });
  return { ...input, id: rec.recordId, preset: false, createdAt: 0, uses: 0 };
}
/** 软删除自定义模板(多维表格记录状态置为已删除, 保留可追溯) */
export async function removeCustomTemplate(recordId: string): Promise<void> {
  await updateModuleRecord('reportTpl', recordId, { rowState: '已删除' });
}

/* ---------------------- 定时推送配置(多维表格「定时推送」表) ---------------------- */
export interface PushTask {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  frequency: '每日' | '每周' | '每月';
  pushTime: string; // HH:mm
  groups: string; // 接收飞书群(逗号分隔)
  format: '卡片消息' | '文件附件' | '两者';
  atAll: boolean;
  enabled: boolean;
  lastPush?: string;
  createdAt: number;
}
/** 从多维表格实时读取推送任务 */
export async function fetchPushTasks(): Promise<PushTask[]> {
  const recs = await loadModuleRecords('reportPush', true);
  return recs
    .filter((r) => str(r.values.rowState) !== '已删除')
    .map((r) => {
      const v = r.values;
      const tpl = str(v.tpl);
      const [templateId, ...rest] = tpl.split('::');
      return {
        id: r.recordId,
        name: str(v.name),
        templateId,
        templateName: rest.join('::') || templateId,
        frequency: (str(v.freq) || '每日') as PushTask['frequency'],
        pushTime: str(v.time) || '09:00',
        groups: str(v.group),
        format: (str(v.fmt) || '卡片消息') as PushTask['format'],
        atAll: str(v.atAll) === '是',
        enabled: str(v.enabled) === '启用',
        lastPush: str(v.lastPush) || undefined,
        createdAt: 0,
      };
    });
}
function pushValues(t: Omit<PushTask, 'id' | 'createdAt'>): Record<string, string | number> {
  return {
    name: t.name,
    tpl: `${t.templateId}::${t.templateName}`,
    freq: t.frequency,
    time: t.pushTime,
    group: t.groups,
    fmt: t.format,
    atAll: t.atAll ? '是' : '否',
    enabled: t.enabled ? '启用' : '停用',
    lastPush: t.lastPush ?? '',
    rowState: '正常',
  };
}
export async function createPushTask(t: Omit<PushTask, 'id' | 'createdAt'>): Promise<string> {
  const rec = await createModuleRecord('reportPush', pushValues(t));
  return rec.recordId;
}
export async function updatePushTask(id: string, t: Omit<PushTask, 'id' | 'createdAt'>): Promise<void> {
  await updateModuleRecord('reportPush', id, pushValues(t));
}
export async function removePushTask(id: string): Promise<void> {
  await updateModuleRecord('reportPush', id, { rowState: '已删除' });
}

export function asModuleKey(key: string): ModuleKey {
  return key as ModuleKey;
}
