export const CHECK_SCOPE_OPTS = ['全部物资', '按仓库', '按分类'] as const;

export interface CheckDetailItem {
  inventoryId: string;
  materialName: string;
  category: string;
  location: string;
  systemQty: number;
  actualQty: number | null;
  remark?: string;
}

export function parseCheckDetail(raw: unknown): CheckDetailItem[] {
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.trim().length === 0) return [];
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((it): it is Record<string, unknown> => it !== null && typeof it === 'object')
    .map((it) => ({
      inventoryId: String(it.inventoryId ?? ''),
      materialName: String(it.materialName ?? ''),
      category: String(it.category ?? ''),
      location: String(it.location ?? ''),
      systemQty: Number(it.systemQty ?? 0),
      actualQty: it.actualQty === null || it.actualQty === undefined ? null : Number(it.actualQty),
      remark: it.remark === null || it.remark === undefined ? undefined : String(it.remark),
    }))
    .filter((it) => it.materialName.length > 0);
}
