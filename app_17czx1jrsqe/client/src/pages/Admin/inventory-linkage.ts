import { inventoriesApi, requisitionsApi } from '@/api';

export interface InventoryRecord {
  id: string | number;
  material_name: string;
  category?: string;
  unit?: string;
  stock_quantity: number;
  warning_quantity: number;
  location?: string;
  remark?: string;
}

const toList = (res: any): any[] => res?.data?.list ?? res?.data?.items ?? [];

export async function fetchAllInventories(): Promise<InventoryRecord[]> {
  const res = await inventoriesApi.list({ pageSize: 500 });
  return toList(res).map((x: any) => ({ ...x, stock_quantity: Number(x.stock_quantity) || 0 }));
}

export async function findInventoryByName(materialName: string): Promise<InventoryRecord | null> {
  const list = await fetchAllInventories();
  return list.find((x) => x.material_name === materialName) ?? null;
}

export async function ensureInventory(materialName: string, category?: string): Promise<InventoryRecord> {
  const found = await findInventoryByName(materialName);
  if (found) return found;
  const res = await inventoriesApi.create({
    material_name: materialName,
    category: category || '',
    unit: '',
    stock_quantity: 0,
    warning_quantity: 0,
    location: '',
    remark: '自动创建',
  });
  return res?.data ?? ({ id: res?.id, material_name: materialName, stock_quantity: 0, warning_quantity: 0 } as InventoryRecord);
}

export async function adjustStockByName(
  materialName: string,
  delta: number,
  category?: string,
): Promise<{ ok: boolean; stock: number; message?: string }> {
  const inv = await ensureInventory(materialName, category);
  const next = Number(inv.stock_quantity) + delta;
  if (next < 0) return { ok: false, stock: Number(inv.stock_quantity), message: `「${materialName}」库存不足，当前 ${inv.stock_quantity}` };
  await inventoriesApi.update(inv.id, { stock_quantity: next });
  return { ok: true, stock: next };
}

export async function getPendingReservedQty(materialName: string, excludeId?: string | number): Promise<number> {
  const res = await requisitionsApi.list({ pageSize: 500 });
  return toList(res)
    .filter((x: any) => x.material_name === materialName && x.status === 'pending' && String(x.id) !== String(excludeId ?? ''))
    .reduce((sum: number, x: any) => sum + (Number(x.quantity) || 0), 0);
}

export async function getAvailableStock(
  materialName: string,
  excludeId?: string | number,
): Promise<{ stock: number; reserved: number; available: number; inventory: InventoryRecord | null }> {
  const inventory = await findInventoryByName(materialName);
  const stock = Number(inventory?.stock_quantity) || 0;
  const reserved = await getPendingReservedQty(materialName, excludeId);
  return { stock, reserved, available: stock - reserved, inventory };
}
