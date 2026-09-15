import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '@server/common/cache/cache.service';
import { FeishuBitableService } from '../feishu-bitable/feishu-bitable.service';
import type {
  AbnormalCheckItem,
  InventoryOverview,
  OwnerMatrixMonthItem,
  OwnerMatrixRow,
  PagedResponse,
  StockByType,
  StockOverview,
  StockTrendItem,
  StockTrendMonthType,
  TimelineOwner,
} from '@shared/api.interface';

const ASSET_META_MARKER = '[ASSET_META]';
const TASK_MARKER = '[TASK]';

interface EnrichedCheck {
  raw: Record<string, unknown>;
  assetName: string;
  assetType: string;
  owner: string;
  ownerName: string;
  assetCode: string;
  checkYear: number;
  checkMonth: string;
  checkMonthNum: number;
  checkDate: string;
  status: string;
  bookQuantity: number;
  actualQuantity: number | null;
  difference: number | null;
}

function enrichCheckRecord(
  rec: Record<string, unknown>,
  assetByAssetName?: Map<string, { owner: string; ownerName: string; assetType: string }>,
): EnrichedCheck {
  const rawRemark = String(rec.remark ?? '');
  let assetName = (rec.asset_name as string) ?? '';
  let assetType = (rec.asset_type as string) ?? '';
  let owner = (rec.owner as string) ?? '';
  let ownerName = '';
  let assetCode = '';

  if (rawRemark.startsWith(ASSET_META_MARKER)) {
    const firstLine = rawRemark.split('\n')[0];
    const parts = firstLine.slice(ASSET_META_MARKER.length).split('|');
    if (parts.length >= 2) assetName = assetName || parts[1] || '';
    if (parts.length >= 3) assetType = assetType || parts[2] || '';
    if (parts.length >= 4) assetCode = parts[3] || '';
    if (parts.length >= 5) owner = owner || parts[4] || '';
  }

  if (assetName && assetByAssetName?.has(assetName)) {
    const matched = assetByAssetName.get(assetName)!;
    if (!owner) owner = matched.owner;
    if (!ownerName) ownerName = matched.ownerName;
    if (!assetType) assetType = matched.assetType;
  }

  const status = (rec.status as string) ?? 'pending';
  const isChecked = status !== 'pending' && status !== 'unchecked';
  const actualRaw = rec.actual_quantity;
  const actual = isChecked && actualRaw !== undefined && actualRaw !== null
    ? Number(actualRaw)
    : null;
  const book = Number(rec.book_quantity ?? 0);
  const diff = actual !== null ? actual - book : null;

  const monthStr = (rec.check_month as string) ?? '';
  const monthNum = parseInt(monthStr.slice(-2), 10) || 0;

  return {
    raw: rec,
    assetName,
    assetType,
    owner,
    ownerName,
    assetCode,
    checkYear: Number(rec.check_year ?? 0),
    checkMonth: monthStr,
    checkMonthNum: monthNum,
    checkDate: (rec.check_date as string) ?? '',
    status: isChecked ? status : 'pending',
    bookQuantity: book,
    actualQuantity: actual,
    difference: diff,
  };
}

function buildAssetMetaMap(
  assets: Record<string, unknown>[],
): Map<string, { owner: string; ownerName: string; assetType: string }> {
  const map = new Map<string, { owner: string; ownerName: string; assetType: string }>();
  for (const a of assets) {
    const name = (a.asset_name as string) ?? '';
    if (!name) continue;
    const ownerInfo = resolveOwner(a);
    const type = (a.asset_type as string) ?? '';
    if (!map.has(name)) {
      map.set(name, { owner: ownerInfo.id, ownerName: ownerInfo.name, assetType: type });
    }
  }
  return map;
}

function isTaskRecord(rec: Record<string, unknown>): boolean {
  return String(rec.remark ?? '').startsWith(TASK_MARKER);
}

function resolveOwner(rec: Record<string, unknown>): { id: string; name: string } {
  const owner = extractOwnerInfo(rec.owner, rec.owner_name as string);
  if (owner.id) return owner;
  const handler = extractOwnerInfo(rec.handler, rec.handler_name as string);
  if (handler.id) return handler;
  return { id: '', name: '' };
}

function extractOwnerInfo(ownerField: unknown, ownerNameField?: string): { id: string; name: string } {
  if (!ownerField && !ownerNameField) return { id: '', name: '' };
  if (typeof ownerField === 'string') {
    return { id: ownerField, name: ownerNameField || ownerField };
  }
  if (typeof ownerField === 'number') {
    return { id: String(ownerField), name: ownerNameField || String(ownerField) };
  }
  if (Array.isArray(ownerField)) {
    if (ownerField.length === 0) return { id: '', name: '' };
    const first = ownerField[0];
    if (typeof first === 'string') return { id: first, name: ownerNameField || first };
    if (typeof first === 'number') return { id: String(first), name: ownerNameField || String(first) };
    if (typeof first === 'object' && first) {
      const obj = first as Record<string, unknown>;
      const id = String(obj.id ?? obj.user_id ?? obj.open_id ?? '');
      const name = String(obj.name ?? obj.user_name ?? obj.text ?? id);
      return { id, name };
    }
  }
  if (typeof ownerField === 'object' && ownerField) {
    const obj = ownerField as Record<string, unknown>;
    const id = String(obj.id ?? obj.user_id ?? obj.open_id ?? '');
    const name = String(obj.name ?? obj.user_name ?? obj.text ?? id);
    return { id, name };
  }
  return { id: '', name: ownerNameField || '' };
}

@Injectable()
export class InventoryDashboardService {
  private readonly assetsDomain = 'fixed_assets';
  private readonly checksDomain = 'inventory_checks';

  constructor(
    private readonly bitable: FeishuBitableService,
    private readonly cache: CacheService,
  ) {}

  private readonly CACHE_PREFIX = 'dash:inventory:';
  private readonly CACHE_TTL_MS = 60_000;

  /** 清除所有盘点看板相关缓存，供盘点写操作（complete/reset/remove/update/confirmDiff/batchUpdate）调用 */
  async invalidateDashboardCache(): Promise<number> {
    return await this.cache.deleteByPrefix(this.CACHE_PREFIX);
  }

  private cacheKey(segment: string, params?: Record<string, unknown>): string {
    const suffix = params ? JSON.stringify(params) : '';
    return `${this.CACHE_PREFIX}${segment}${suffix}`;
  }

  async getOverview(): Promise<InventoryOverview> {
    const cacheKey = this.cacheKey('overview');
    const cached = await this.cache.get<InventoryOverview>(cacheKey);
    if (cached) return cached;

    const [assets, checks] = await Promise.all([
      this.bitable.getAllRecords(this.assetsDomain),
      this.bitable.getAllRecords(this.checksDomain),
    ]);

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();

    const totalAssets = assets.length;
    const assetMetaMap = buildAssetMetaMap(assets);

    const enrichedChecks = checks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec, assetMetaMap));

    const monthChecks = enrichedChecks.filter((c) => {
      return c.checkYear === currentYear && c.checkMonth.endsWith(currentMonth);
    });

    let checkedThisMonth = 0;
    let abnormalCount = 0;

    for (const c of monthChecks) {
      if (c.status === 'checked' || c.status === 'abnormal' || c.status === 'resolved') {
        checkedThisMonth += 1;
      }
      if (c.difference !== null && c.difference !== 0) abnormalCount += 1;
    }

    const uncheckedCount = Math.max(0, totalAssets - checkedThisMonth);
    const completionRate =
      totalAssets === 0
        ? 0
        : Math.round((checkedThisMonth / totalAssets) * 10000) / 100;

    const lastCheckByName = new Map<string, string>();
    for (const c of enrichedChecks) {
      if (c.status === 'pending' || c.status === 'unchecked') continue;
      if (!c.checkDate) continue;
      const dedupKey = c.assetCode || c.assetName || '';
      if (!dedupKey) continue;
      const existing = lastCheckByName.get(dedupKey);
      if (!existing || c.checkDate > existing) {
        lastCheckByName.set(dedupKey, c.checkDate);
      }
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let overdueCount = 0;
    for (const rec of assets) {
      const assetName = (rec.asset_name as string) ?? '';
      const assetCode = (rec.asset_code as string) ?? '';
      const lastCheck = lastCheckByName.get(assetCode || assetName) ?? '';
      const purchaseDate = (rec.purchase_date as string) ?? '';
      const refDateStr = lastCheck || purchaseDate;
      const refDate = refDateStr ? new Date(refDateStr) : null;
      if (!refDate || isNaN(refDate.getTime()) || refDate < thirtyDaysAgo) {
        overdueCount += 1;
      }
    }

    const result: InventoryOverview = {
      totalAssets,
      checkedThisMonth,
      uncheckedCount,
      abnormalCount,
      completionRate,
      overdueCount,
    };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async getOwnerMatrix(
    _department?: string,
    search?: string,
  ): Promise<{ items: OwnerMatrixRow[] }> {
    const cacheKey = this.cacheKey('ownerMatrix', { search });
    const cached = await this.cache.get<{ items: OwnerMatrixRow[] }>(cacheKey);
    if (cached) return cached;

    const [assets, checks] = await Promise.all([
      this.bitable.getAllRecords(this.assetsDomain),
      this.bitable.getAllRecords(this.checksDomain),
    ]);

    const currentYear = new Date().getFullYear();
    const assetMetaMap = buildAssetMetaMap(assets);
    const ownerMap = new Map<string, { count: number; name: string; department: string }>();

    for (const rec of assets) {
      const ownerInfo = resolveOwner(rec);
      if (!ownerInfo.id) continue;
      const dept = (rec.purchase_department as string) ?? '';
      if (search && !ownerInfo.name.includes(search)) continue;
      const existing = ownerMap.get(ownerInfo.id);
      const stock = Number(rec.current_stock ?? 1);
      if (existing) {
        existing.count += stock;
        if (!existing.department && dept) existing.department = dept;
      } else {
        ownerMap.set(ownerInfo.id, {
          count: stock,
          name: ownerInfo.name,
          department: dept || '未分配',
        });
      }
    }

    const enrichedChecks = checks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec, assetMetaMap));

    const checkMap = new Map<string, Map<number, { status: string; checkDate: string }>>();

    for (const c of enrichedChecks) {
      if (c.checkYear !== currentYear) continue;
      if (!c.owner || !ownerMap.has(c.owner)) continue;
      if (!c.checkMonthNum) continue;

      if (!checkMap.has(c.owner)) {
        checkMap.set(c.owner, new Map());
      }
      const monthMap = checkMap.get(c.owner)!;
      const existing = monthMap.get(c.checkMonthNum);
      const effectiveStatus = c.difference !== null && c.difference !== 0
        ? 'abnormal'
        : c.status === 'checked' || c.status === 'resolved'
          ? 'checked'
          : c.status;
      if (!existing || effectiveStatus === 'abnormal') {
        monthMap.set(c.checkMonthNum, { status: effectiveStatus, checkDate: c.checkDate });
      }
    }

    const items: OwnerMatrixRow[] = [];
    for (const [ownerId, data] of ownerMap.entries()) {
      const monthMap = checkMap.get(ownerId) ?? new Map();
      const monthly: OwnerMatrixMonthItem[] = [];

      for (let m = 1; m <= 12; m += 1) {
        const rec = monthMap.get(m);
        if (rec && rec.status === 'abnormal') {
          monthly.push({ month: m, status: 'abnormal', checkDate: rec.checkDate });
        } else if (rec && (rec.status === 'checked' || rec.status === 'resolved')) {
          monthly.push({ month: m, status: 'checked', checkDate: rec.checkDate });
        } else {
          monthly.push({ month: m, status: 'unchecked' });
        }
      }

      items.push({
        ownerId,
        ownerName: data.name,
        department: data.department,
        assetCount: data.count,
        monthly,
      });
    }

    const result = { items };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async getTimeline(sort: string = 'days_desc'): Promise<{ items: TimelineOwner[] }> {
    const cacheKey = this.cacheKey('timeline', { sort });
    const cached = await this.cache.get<{ items: TimelineOwner[] }>(cacheKey);
    if (cached) return cached;

    const [assets, checks] = await Promise.all([
      this.bitable.getAllRecords(this.assetsDomain),
      this.bitable.getAllRecords(this.checksDomain),
    ]);

    const assetMetaMap = buildAssetMetaMap(assets);
    const ownerMap = new Map<string, { count: number; earliest: string; name: string; department: string }>();

    for (const rec of assets) {
      const owner = resolveOwner(rec);
      if (!owner.id) continue;
      const dept = (rec.purchase_department as string) ?? '';
      const existing = ownerMap.get(owner.id);
      const createdAt = (rec.purchase_date as string) ?? '';
      if (!existing) {
        ownerMap.set(owner.id, {
          count: Number(rec.current_stock ?? 1),
          earliest: createdAt,
          name: owner.name,
          department: dept || '未分配',
        });
      } else {
        existing.count += Number(rec.current_stock ?? 1);
        if (createdAt && (!existing.earliest || createdAt < existing.earliest)) {
          existing.earliest = createdAt;
        }
        if (!existing.department || existing.department === '未分配') {
          if (dept) existing.department = dept;
        }
      }
    }

    const enrichedChecks = checks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec, assetMetaMap));

    const lastCheckMap = new Map<string, string>();
    for (const c of enrichedChecks) {
      if (!c.owner || !ownerMap.has(c.owner)) continue;
      if (!c.checkDate) continue;
      if (c.status === 'pending' || c.status === 'unchecked') continue;
      const existing = lastCheckMap.get(c.owner);
      if (!existing || c.checkDate > existing) {
        lastCheckMap.set(c.owner, c.checkDate);
      }
    }

    const now = new Date();
    const items: TimelineOwner[] = [];

    for (const [ownerId, data] of ownerMap.entries()) {
      const lastCheck = lastCheckMap.get(ownerId) ?? data.earliest;
      const lastDate = lastCheck ? new Date(lastCheck) : null;
      const daysSince =
        lastDate && !isNaN(lastDate.getTime())
          ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

      const nextDate = lastDate
        ? new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        : now;

      let statusLevel: 'normal' | 'warning' | 'overdue' = 'normal';
      if (daysSince > 60) statusLevel = 'overdue';
      else if (daysSince > 30) statusLevel = 'warning';

      items.push({
        ownerId,
        ownerName: data.name,
        department: data.department,
        assetCount: data.count,
        lastCheckDate: lastCheck,
        daysSinceLastCheck: daysSince,
        nextSuggestedDate: nextDate.toISOString().slice(0, 10),
        statusLevel,
      });
    }

    if (sort === 'days_desc') {
      items.sort((a, b) => b.daysSinceLastCheck - a.daysSinceLastCheck);
    } else {
      items.sort((a, b) => a.daysSinceLastCheck - b.daysSinceLastCheck);
    }

    const result = { items };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async getStock(): Promise<StockOverview> {
    const cacheKey = this.cacheKey('stock');
    const cached = await this.cache.get<StockOverview>(cacheKey);
    if (cached) return cached;

    const assets = await this.bitable.getAllRecords(this.assetsDomain);

    const byType = new Map<string, { count: number; value: number }>();
    let totalValue = 0;
    const ownerCountMap = new Map<string, number>();

    for (const rec of assets) {
      const type = (rec.asset_type as string) ?? 'other';
      const amount = Number(rec.purchase_amount ?? 0);
      const currentStock = Number(rec.current_stock ?? 1);

      totalValue += amount * currentStock;

      const existing = byType.get(type);
      if (existing) {
        existing.count += 1;
        existing.value += amount * currentStock;
      } else {
        byType.set(type, { count: 1, value: amount * currentStock });
      }

      const owner = (rec.owner as string) ?? '';
      if (owner) {
        ownerCountMap.set(owner, (ownerCountMap.get(owner) ?? 0) + currentStock);
      }
    }

    const items: StockByType[] = Array.from(byType.entries()).map(([type, data]) => ({
      assetType: type,
      count: data.count,
      value: Math.round(data.value * 100) / 100,
      suggestedPurchase: 0,
    }));

    const topOwners = Array.from(ownerCountMap.entries())
      .map(([ownerId, count]) => ({ ownerId, ownerName: ownerId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const result: StockOverview = {
      totalValue: Math.round(totalValue * 100) / 100,
      byType: items,
      topOwners,
    };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async getStockTrend(monthsParam: string = '6'): Promise<{ items: StockTrendItem[] }> {
    const cacheKey = this.cacheKey('stockTrend', { monthsParam });
    const cached = await this.cache.get<{ items: StockTrendItem[] }>(cacheKey);
    if (cached) return cached;

    const assets = await this.bitable.getAllRecords(this.assetsDomain);
    const months = Math.max(1, Math.min(24, parseInt(monthsParam, 10) || 6));

    const now = new Date();
    const items: StockTrendItem[] = [];

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const typeMap = new Map<string, number>();

      for (const rec of assets) {
        const purchaseDate = (rec.purchase_date as string) ?? '';
        if (!purchaseDate) continue;
        const pd = new Date(purchaseDate);
        if (isNaN(pd.getTime()) || pd > d) continue;

        const type = (rec.asset_type as string) ?? 'other';
        const currentStock = Number(rec.current_stock ?? 1);
        typeMap.set(type, (typeMap.get(type) ?? 0) + currentStock);
      }

      const byType: StockTrendMonthType[] = Array.from(typeMap.entries()).map(
        ([assetType, count]) => ({ assetType, count }),
      );

      items.push({ month: monthStr, byType });
    }

    const result = { items };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async getAbnormalList(params: {
    page: number;
    pageSize: number;
  }): Promise<PagedResponse<AbnormalCheckItem>> {
    const cacheKey = this.cacheKey('abnormalList', params);
    const cached = await this.cache.get<PagedResponse<AbnormalCheckItem>>(cacheKey);
    if (cached) return cached;

    const [allChecks, allAssets] = await Promise.all([
      this.bitable.getAllRecords(this.checksDomain),
      this.bitable.getAllRecords(this.assetsDomain),
    ]);

    const assetMetaMap = buildAssetMetaMap(allAssets);
    const assetMap = new Map<string, Record<string, unknown>>();
    for (const asset of allAssets) {
      const name = (asset.asset_name as string) ?? '';
      if (name) assetMap.set(name, asset);
    }

    const enriched = allChecks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec, assetMetaMap));

    const abnormalChecks = enriched.filter(
      (c) => c.difference !== null && c.difference !== 0,
    );

    const total = abnormalChecks.length;
    const start = (params.page - 1) * params.pageSize;
    const pageItems = abnormalChecks.slice(start, start + params.pageSize);

    const items: AbnormalCheckItem[] = pageItems.map((c) => {
      const assetName = c.assetName;
      const ownerName = c.ownerName;
      let assetType = c.assetType;

      if ((!assetName || !ownerName || !assetType) && assetMap.has(assetName)) {
        const matched = assetMap.get(assetName)!;
        const matchedOwner = resolveOwner(matched);
        return {
          id: (c.raw.recordId as string) ?? (c.raw.id as string) ?? '',
          ownerName: ownerName || matchedOwner.name || (matched.owner as string) || '-',
          assetName: assetName || (matched.asset_name as string) || '-',
          assetType: assetType || (matched.asset_type as string) || '-',
          bookQuantity: c.bookQuantity,
          actualQuantity: c.actualQuantity ?? 0,
          difference: c.difference ?? 0,
          checkDate: c.checkDate,
          status: c.difference !== 0 ? 'abnormal' : c.status,
        };
      }

      return {
        id: (c.raw.recordId as string) ?? (c.raw.id as string) ?? '',
        ownerName: ownerName || '-',
        assetName: assetName || '-',
        assetType: assetType || '-',
        bookQuantity: c.bookQuantity,
        actualQuantity: c.actualQuantity ?? 0,
        difference: c.difference ?? 0,
        checkDate: c.checkDate,
        status: c.difference !== 0 ? 'abnormal' : c.status,
      };
    });

    const result = { items, total };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async resolveAbnormal(id: string): Promise<{ success: boolean }> {
    const rec = await this.bitable.getRecord(this.checksDomain, id);
    if (!rec) {
      throw new NotFoundException('盘点异常记录不存在');
    }

    await this.bitable.updateRecord(this.checksDomain, id, {
      status: 'resolved',
    });

    return { success: true };
  }

  async batchCleanAbnormal(): Promise<{ deletedCount: number }> {
    const allChecks = await this.bitable.getAllRecords(this.checksDomain);
    const enriched = allChecks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec));
    const toDelete = enriched.filter((c) => {
      const diff = c.difference ?? 0;
      const actual = c.actualQuantity ?? 0;
      return diff < 0 && actual === 0;
    });

    if (toDelete.length === 0) return { deletedCount: 0 };

    const ids = toDelete.map((c) => (c.raw.recordId as string) ?? (c.raw.id as string) ?? '');
    const validIds = ids.filter((id) => id);

    await this.bitable.batchDeleteRecords(this.checksDomain, validIds);
    return { deletedCount: validIds.length };
  }

  async getCompletionRateTrend(
    monthsParam: string = '6',
  ): Promise<{ items: Array<{ month: string; rate: number; total: number; checked: number }> }> {
    const cacheKey = this.cacheKey('completionRateTrend', { monthsParam });
    const cached = await this.cache.get<{ items: Array<{ month: string; rate: number; total: number; checked: number }> }>(cacheKey);
    if (cached) return cached;

    const [assets, rawChecks] = await Promise.all([
      this.bitable.getAllRecords(this.assetsDomain),
      this.bitable.getAllRecords(this.checksDomain),
    ]);

    const months = Math.max(1, Math.min(24, parseInt(monthsParam, 10) || 6));
    const now = new Date();
    const items: Array<{ month: string; rate: number; total: number; checked: number }> = [];
    const assetMetaMap = buildAssetMetaMap(assets);

    const checks = rawChecks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec, assetMetaMap));

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const monthChecks = checks.filter((c) => c.checkMonth === monthStr);

      let checked = 0;
      for (const c of monthChecks) {
        if (c.status === 'checked' || c.status === 'abnormal' || c.status === 'resolved') {
          checked += 1;
        }
      }

      const total = assets.length;
      const rate =
        total === 0
          ? 0
          : Math.round((checked / total) * 10000) / 100;

      items.push({ month: monthStr, rate, total, checked });
    }

    const result = { items };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  async getDepartmentCompletionRanking(): Promise<{
    items: Array<{ department: string; rate: number; checked: number; total: number }>;
  }> {
    const cacheKey = this.cacheKey('departmentCompletionRanking');
    const cached = await this.cache.get<{
      items: Array<{ department: string; rate: number; checked: number; total: number }>;
    }>(cacheKey);
    if (cached) return cached;

    const [assets, rawChecks] = await Promise.all([
      this.bitable.getAllRecords(this.assetsDomain),
      this.bitable.getAllRecords(this.checksDomain),
    ]);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const assetMetaMap = buildAssetMetaMap(assets);
    const ownerDeptMap = new Map<string, string>();
    const deptTotalMap = new Map<string, number>();

    for (const rec of assets) {
      const owner = resolveOwner(rec);
      const dept = (rec.purchase_department as string) || '未分配';
      const stock = Number(rec.current_stock ?? 1);
      if (owner.id && !ownerDeptMap.has(owner.id)) {
        ownerDeptMap.set(owner.id, dept);
      }
      deptTotalMap.set(dept, (deptTotalMap.get(dept) ?? 0) + stock);
    }

    const checks = rawChecks
      .filter((rec) => !isTaskRecord(rec))
      .map((rec) => enrichCheckRecord(rec, assetMetaMap));

    const deptCheckedMap = new Map<string, number>();
    const monthChecks = checks.filter(
      (c) => c.checkMonth === currentMonth
        && (c.status === 'checked' || c.status === 'abnormal' || c.status === 'resolved'),
    );

    for (const c of monthChecks) {
      const dept = ownerDeptMap.get(c.owner) ?? '未分配';
      deptCheckedMap.set(dept, (deptCheckedMap.get(dept) ?? 0) + 1);
    }

    const items = Array.from(deptTotalMap.entries()).map(([dept, total]) => {
      const checked = deptCheckedMap.get(dept) ?? 0;
      const rate = total === 0 ? 0 : Math.round((checked / total) * 10000) / 100;
      return { department: dept, rate, checked, total };
    });

    items.sort((a, b) => b.rate - a.rate);
    const result = { items: items.slice(0, 10) };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }
}
