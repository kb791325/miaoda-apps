/**
 * 行业大盘真实取数：全量拉取 财务-消耗 / 客户管理 / 业务-行业ROI 三张表并归一化。
 * 数据源（无行业列，行业经「客户管理」按客户名称映射）：
 *  - 财务-消耗：客户名称 / 消耗金额 / 消耗日期
 *  - 客户管理：客户名称 / 一级行业
 *  - 业务-行业ROI：行业名称 / 平均CPC / ROI基准
 */
import { consumptionsApi, customersApi, industryRoisApi } from './entities';
import type { NormalizedConsume, OverviewRaw, RoiBaseline } from '@/pages/Business/industry-overview-data';

type RawRow = Record<string, unknown>;
type RawListFn = (params: Record<string, unknown>) => Promise<{
  code: number;
  message?: string;
  data?: { list?: RawRow[]; has_more?: boolean; next_page_token?: string };
}>;

const PAGE_SIZE = 500;

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 单选字段可能是 {id,name} 对象或多选数组，统一提取文本 */
export const extractText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(extractText).filter(Boolean).join('、');
  if (typeof v === 'object') {
    const obj = v as { name?: unknown; text?: unknown; value?: unknown };
    return extractText(obj.name ?? obj.text ?? obj.value);
  }
  return '';
};

/** rawList + page_token 循环拉全量（与 export-schemas 的 fetchAllPages 同款） */
export const fetchAllRows = async (listFn: RawListFn): Promise<RawRow[]> => {
  const out: RawRow[] = [];
  let pageToken: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const res = await listFn({ pageSize: PAGE_SIZE, ...(pageToken ? { pageToken } : {}) });
    if (res.code !== 0 || !res.data) throw new Error(res.message || '数据加载失败');
    out.push(...(res.data.list || []));
    hasMore = !!res.data.has_more && !!res.data.next_page_token;
    pageToken = res.data.next_page_token;
  }
  return out;
};

export const loadIndustryOverview = async (): Promise<OverviewRaw> => {
  const [consumeRows, customerRows, roiRows] = await Promise.all([
    fetchAllRows(consumptionsApi.rawList),
    fetchAllRows(customersApi.rawList),
    fetchAllRows(industryRoisApi.rawList),
  ]);

  // 客户名称 → 一级行业
  const industryMap = new Map<string, string>();
  customerRows.forEach((r: RawRow) => {
    const name = extractText(r['客户名称']);
    const industry = extractText(r['一级行业']);
    if (name && industry) industryMap.set(name, industry);
  });

  const consumes: NormalizedConsume[] = consumeRows
    .map((r: RawRow): NormalizedConsume => ({
      industry: industryMap.get(extractText(r['客户名称'])) ?? '未知行业',
      amount: toNum(r['消耗金额']),
      dateKey: extractText(r['消耗日期']).slice(0, 10).replace(/\//g, '-'),
    }))
    .filter((r: NormalizedConsume) => r.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.dateKey));

  const roiBaselines: RoiBaseline[] = roiRows
    .map((r: RawRow): RoiBaseline => ({
      industry: extractText(r['行业名称']),
      avgCpc: toNum(r['平均CPC']),
      roiBase: toNum(r['ROI基准']),
    }))
    .filter((r: RoiBaseline) => r.industry !== '' && (r.avgCpc > 0 || r.roiBase > 0));

  return { consumes, roiBaselines };
};
