import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { BitableEntityService } from './bitable.entity.service';
import { BitableService } from '../../common/feishu/bitable.service';
import { getTableId } from '../../config/feishu.config';

const INVENTORY_TABLE = '行政-库存物资';
const STOCK_IN_TABLE = '行政-入库记录';
const REQUISITION_TABLE = '行政-领用记录';
const RETURN_TABLE = '行政-归还记录';
const CHECK_TABLE = '行政-库存盘点';
const DETAIL_TABLE = '采购-采购明细';

/** 参与库存联动的表 */
const LINKAGE_TABLES = new Set([STOCK_IN_TABLE, REQUISITION_TABLE, RETURN_TABLE, CHECK_TABLE, DETAIL_TABLE]);

const RETURN_LINK_FIELD = '关联领用单';
const CHECK_DETAIL_FIELD = '盘点明细';
const CHECK_FIELDS_TO_ENSURE: Array<[string, number]> = [
  ['盘点明细', 1],
  ['盘点范围类型', 1],
  ['仓库', 1],
  ['分类', 1],
  ['盘盈项数', 2],
  ['盘亏项数', 2],
];

interface CheckDetailItem {
  materialName: string;
  category: string;
  location: string;
  systemQty: number;
  actualQty: number | null;
}

function parseCheckDetail(v: unknown): CheckDetailItem[] {
  let raw: unknown = v;
  if (typeof v === 'string') {
    const text = v.trim();
    if (!text) return [];
    try {
      raw = JSON.parse(text);
    } catch {
      return [];
    }
  }
  {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((it): it is Record<string, unknown> => it !== null && typeof it === 'object')
      .map((it) => ({
        materialName: toText(it['materialName']).trim(),
        category: toText(it['category']).trim(),
        location: toText(it['location']).trim(),
        systemQty: num(it['systemQty']),
        actualQty: it['actualQty'] === null || it['actualQty'] === undefined ? null : num(it['actualQty']),
      }))
      .filter((it) => it.materialName.length > 0);
  }
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

function today(): string {
  const d = new Date();
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function genNo(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** 领用/归还/盘点/收货状态归一：兼容英文 code 与中文枚举 */
export function adminStatusZh(v: unknown): string {
  const s = toText(v).trim();
  const map: Record<string, string> = {
    pending: '待确认', confirmed: '已确认', rejected: '已驳回',
    in_progress: '盘点中', completed: '已完成',
    received: '已收货', pending_receive: '待收货',
  };
  return map[s] || s;
}

@Injectable()
export class AdminLinkageService {
  private readonly logger = new Logger(AdminLinkageService.name);

  constructor(
    private readonly entity: BitableEntityService,
    private readonly bitable: BitableService,
  ) {}

  /** 模块初始化即建列：盘点明细/范围类型/仓库/分类/盘盈盘亏项数（幂等） */
  async onModuleInit(): Promise<void> {
    try {
      const tableId = getTableId(CHECK_TABLE);
      const res: unknown = await this.bitable.listFields(tableId);
      const fields: Array<{ field_name?: string }> = Array.isArray(res)
        ? (res as Array<{ field_name?: string }>)
        : (((res as { data?: { items?: Array<{ field_name?: string }> } })?.data?.items || []) as Array<{ field_name?: string }>);
      const names = new Set(fields.map((f) => String(f?.field_name || '')));
      for (const [name, type] of CHECK_FIELDS_TO_ENSURE) {
        if (names.has(name)) continue;
        await this.bitable.createField(tableId, { field_name: name, type });
        this.logger.log(`已为 ${CHECK_TABLE} 补建字段「${name}」`);
      }
    } catch (err) {
      this.logger.warn(`盘点字段补建失败（不阻断模块启动）: ${err instanceof Error ? err.message : err}`);
    }
  }

  isLinkageTable(tableKey: string): boolean {
    return LINKAGE_TABLES.has(tableKey);
  }

  /**
   * 写库前校验：领用确认时校验可用库存（动态预占 = 在库 - 其他待确认领用），
   * 不足则抛 ConflictException 阻止状态流转。
   */
  async beforeUpdate(tableKey: string, oldRecord: Record<string, unknown>, fields: Record<string, unknown>): Promise<void> {
    if (tableKey !== REQUISITION_TABLE) return;
    const newStatus = adminStatusZh(fields['状态']);
    const oldStatus = adminStatusZh(oldRecord['状态']);
    if (!(oldStatus === '待确认' && newStatus === '已确认')) return;

    const material = toText(oldRecord['物资名称']);
    const qty = num(oldRecord['领用数量']);
    const inventory = await this.findInventory(material);
    if (!inventory) {
      throw new ConflictException(`库存中不存在物资「${material}」，无法确认领用`);
    }
    const stock = num(inventory['库存数量']);
    const reserved = await this.sumPendingReservations(material, this.recordId(oldRecord));
    const available = stock - reserved;
    if (qty > available) {
      throw new ConflictException(
        `物资「${material}」可用库存不足：在库 ${stock}，其他待确认领用预占 ${reserved}，当前可用 ${available}，本次申请 ${qty}`,
      );
    }
  }

  /** 创建后联动：手动新增入库记录 → 库存增加 */
  async afterCreate(tableKey: string, record: Record<string, unknown>): Promise<void> {
    if (tableKey !== STOCK_IN_TABLE) return;
    const material = toText(record['物资名称']);
    const qty = num(record['入库数量']);
    if (!material || qty <= 0) return;
    try {
      await this.addToStock(material, qty, toText(record['分类']));
      this.logger.log(`入库联动: ${material} +${qty}`);
    } catch (err) {
      this.logger.error(`入库联动失败: ${material} +${qty} ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  /**
   * 更新后联动：
   * - 采购明细 待收货→已收货：自动生成入库单 + 库存增加
   * - 领用 待确认→已确认：扣减库存（预占转实扣；驳回不写库，动态预占自然释放）
   * - 归还 待确认→已确认：库存回补 + 回填关联领用单
   * - 盘点 盘点中→已完成：库存对齐实盘数（盘盈/盘亏即差值）
   */
  async afterUpdate(
    tableKey: string,
    oldRecord: Record<string, unknown>,
    newFields: Record<string, unknown>,
  ): Promise<void> {
    const oldStatus = adminStatusZh(oldRecord['状态']);
    const newStatus = adminStatusZh(newFields['状态'] ?? oldRecord['状态']);

    if (tableKey === DETAIL_TABLE) {
      const oldRecv = adminStatusZh(oldRecord['收货状态']);
      const newRecv = adminStatusZh(newFields['收货状态'] ?? oldRecord['收货状态']);
      if (oldRecv === '待收货' && newRecv === '已收货') {
        await this.handleDetailReceived(oldRecord, newFields);
      }
      return;
    }

    if (tableKey === REQUISITION_TABLE && oldStatus === '待确认' && newStatus === '已确认') {
      await this.handleRequisitionConfirmed(oldRecord);
      return;
    }

    if (tableKey === RETURN_TABLE && oldStatus === '待确认' && newStatus === '已确认') {
      await this.handleReturnConfirmed(oldRecord);
      return;
    }

    if (tableKey === CHECK_TABLE && oldStatus === '盘点中' && newStatus === '已完成') {
      await this.handleCheckCompleted({ ...oldRecord, ...newFields });
      return;
    }
  }

  /** 采购明细收货：生成入库单 + 库存增加 */
  private async handleDetailReceived(detail: Record<string, unknown>, newFields: Record<string, unknown>): Promise<void> {
    const material = toText(detail['物资名称']);
    const qty = num(newFields['收货数量'] ?? detail['收货数量'] ?? detail['数量']);
    if (!material || qty <= 0) {
      this.logger.warn(`收货联动跳过：物资或数量无效`);
      return;
    }
    const unitPrice = num(detail['含税单价'] ?? detail['单价']);
    const relatedOrder = toText(detail['关联订单']);
    try {
      await this.entity.create(STOCK_IN_TABLE, {
        入库单号: genNo('SR'),
        物资名称: material,
        分类: '采购入库',
        入库数量: qty,
        含税单价: unitPrice,
        含税总价: Number((unitPrice * qty).toFixed(2)),
        供应商: relatedOrder ? `订单 ${relatedOrder}` : '',
        入库日期: today(),
        经办人: '采购收货自动入库',
        备注: `采购明细收货自动入库（数量 ${qty}）`,
      });
      await this.addToStock(material, qty, '采购入库');
      this.logger.log(`收货联动完成: ${material} +${qty}（已生成入库单）`);
    } catch (err) {
      this.logger.error(`收货联动失败: ${material} ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  /** 领用确认：扣减库存（预占转实扣） */
  private async handleRequisitionConfirmed(record: Record<string, unknown>): Promise<void> {
    const material = toText(record['物资名称']);
    const qty = num(record['领用数量']);
    if (!material || qty <= 0) return;
    const inventory = await this.findInventory(material);
    if (!inventory) {
      this.logger.warn(`领用扣减未找到库存物资「${material}」`);
      return;
    }
    const newStock = Math.max(num(inventory['库存数量']) - qty, 0);
    await this.entity.update(INVENTORY_TABLE, this.recordId(inventory), { 库存数量: newStock });
    this.logger.log(`领用扣减: ${material} -${qty}（余 ${newStock}）`);
  }

  /** 归还确认：库存回补 + 关联领用单 */
  private async handleReturnConfirmed(record: Record<string, unknown>): Promise<void> {
    const material = toText(record['物资名称']);
    const qty = num(record['归还数量']);
    const returner = toText(record['归还人']);
    if (!material || qty <= 0) return;
    await this.addToStock(material, qty);
    const linkedNo = await this.findRelatedRequisition(material, returner);
    if (linkedNo) {
      try {
        await this.ensureReturnLinkField();
        await this.entity.update(RETURN_TABLE, this.recordId(record), { [RETURN_LINK_FIELD]: linkedNo });
      } catch (err) {
        this.logger.warn(`回填「${RETURN_LINK_FIELD}」失败（不阻断归还确认）: ${err instanceof Error ? err.message : err}`);
      }
    }
    this.logger.log(`归还联动: ${material} +${qty} 关联领用单=${linkedNo || '无'}`);
  }

  /** 盘点完成：优先按「盘点明细」逐条对齐库存；无明细时回退单物资逻辑 */
  private async handleCheckCompleted(record: Record<string, unknown>): Promise<void> {
    const items = parseCheckDetail(record[CHECK_DETAIL_FIELD]);
    if (items.length > 0) {
      await this.applyCheckDetails(record, items);
      return;
    }
    const material = toText(record['盘点范围']);
    const actual = num(record['实盘数量']);
    if (!material) {
      this.logger.warn('盘点联动跳过：盘点范围未填写物资名称');
      return;
    }
    const inventory = await this.findInventory(material);
    if (!inventory) {
      if (actual > 0) {
        await this.entity.create(INVENTORY_TABLE, {
          物资名称: material,
          分类: '盘点新增',
          单位: '个',
          库存数量: actual,
          预警阈值: 0,
          存放位置: '盘点录入',
        });
        this.logger.log(`盘点联动: 新建库存物资「${material}」${actual}`);
      }
      return;
    }
    const stock = num(inventory['库存数量']);
    const diff = actual - stock;
    await this.entity.update(INVENTORY_TABLE, this.recordId(inventory), { 库存数量: actual });
    await this.entity.update(CHECK_TABLE, this.recordId(record), {
      系统数量: stock,
      差异数量: diff,
      备注: `${toText(record['备注']) || ''}（系统账面 ${stock} → 实盘 ${actual}，${diff >= 0 ? '盘盈' : '盘亏'} ${Math.abs(diff)}）`.trim(),
    });
    this.logger.log(`盘点联动: ${material} 账面 ${stock} → 实盘 ${actual}（${diff >= 0 ? '盘盈' : '盘亏'} ${Math.abs(diff)}）`);
  }

  /** 多明细盘点：逐条对齐库存（盘盈加/盘亏减即账面=实盘），并回写盘点单汇总 */
  private async applyCheckDetails(
    record: Record<string, unknown>,
    items: CheckDetailItem[],
  ): Promise<void> {
    const inventories = await this.listAllInventories();
    const byName = new Map<string, Record<string, unknown>>();
    for (const inv of inventories) {
      const name = toText(inv['物资名称']).trim();
      if (name.length > 0) byName.set(name, inv);
    }
    let sumSystem = 0;
    let sumActual = 0;
    let gainCount = 0;
    let lossCount = 0;
    for (const item of items) {
      if (item.actualQty === null) continue;
      sumSystem += item.systemQty;
      sumActual += item.actualQty;
      const diff = item.actualQty - item.systemQty;
      if (diff > 0) gainCount += 1;
      if (diff < 0) lossCount += 1;
      const inventory = byName.get(item.materialName);
      try {
        if (inventory) {
          await this.entity.update(INVENTORY_TABLE, this.recordId(inventory), { 库存数量: item.actualQty });
          this.logger.log(`盘点对齐: ${item.materialName} ${num(inventory['库存数量'])} → ${item.actualQty}`);
        } else if (item.actualQty > 0) {
          await this.entity.create(INVENTORY_TABLE, {
            物资名称: item.materialName,
            分类: item.category || '盘点新增',
            单位: '个',
            库存数量: item.actualQty,
            预警阈值: 0,
            存放位置: item.location || '盘点录入',
          });
          this.logger.log(`盘点联动: 新建库存物资「${item.materialName}」${item.actualQty}`);
        }
      } catch (err) {
        this.logger.error(`盘点写回失败: ${item.materialName} ${err instanceof Error ? err.message : err}`);
        throw err;
      }
    }
    await this.entity.update(CHECK_TABLE, this.recordId(record), {
      系统数量: sumSystem,
      实盘数量: sumActual,
      差异数量: sumActual - sumSystem,
      盘盈项数: gainCount,
      盘亏项数: lossCount,
    });
    this.logger.log(
      `盘点汇总: 明细 ${items.length} 项，系统 ${sumSystem} → 实盘 ${sumActual}，盘盈 ${gainCount} 项 / 盘亏 ${lossCount} 项`,
    );
  }

  private async listAllInventories(): Promise<Record<string, unknown>[]> {
    const r = await this.entity.list(INVENTORY_TABLE, { page: 1, pageSize: 500 });
    return r.items || [];
  }

  /** 库存增加；物资不存在时自动建账 */
  private async addToStock(material: string, qty: number, category?: string): Promise<void> {
    if (qty <= 0) return;
    const inventory = await this.findInventory(material);
    if (!inventory) {
      await this.entity.create(INVENTORY_TABLE, {
        物资名称: material,
        分类: category || '其他',
        单位: '个',
        库存数量: qty,
        预警阈值: 0,
      });
      return;
    }
    await this.entity.update(INVENTORY_TABLE, this.recordId(inventory), {
      库存数量: num(inventory['库存数量']) + qty,
    });
  }

  private async findInventory(material: string): Promise<Record<string, unknown> | null> {
    const r = await this.entity.list(INVENTORY_TABLE, {
      page: 1,
      pageSize: 100,
      keyword: material,
    });
    const hit = (r.items || []).find((x: Record<string, unknown>) => toText(x['物资名称']) === material);
    return hit || null;
  }

  /** 动态预占：该物资所有「待确认」领用的数量之和（不含指定记录） */
  private async sumPendingReservations(material: string, excludeRecordId?: string): Promise<number> {
    const r = await this.entity.list(REQUISITION_TABLE, { page: 1, pageSize: 200 });
    return (r.items || [])
      .filter((x: Record<string, unknown>) =>
        toText(x['物资名称']) === material
        && adminStatusZh(x['状态']) === '待确认'
        && this.recordId(x) !== excludeRecordId)
      .reduce((acc: number, x: Record<string, unknown>) => acc + num(x['领用数量']), 0);
  }

  /** 关联领用单：同物资 + 同领用人（归还人）最近一条已确认领用 */
  private async findRelatedRequisition(material: string, returner: string): Promise<string> {
    try {
      const r = await this.entity.list(REQUISITION_TABLE, { page: 1, pageSize: 200 });
      const hit = (r.items || [])
        .filter((x: Record<string, unknown>) =>
          toText(x['物资名称']) === material
          && (!returner || toText(x['领用人']) === returner)
          && ['已确认', 'confirmed'].includes(toText(x['状态'])))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          String(toText(b['申请日期'])).localeCompare(String(toText(a['申请日期']))))[0];
      return hit ? toText(hit['领用单号']) : '';
    } catch {
      return '';
    }
  }

  /** 归还表若无「关联领用单」列则用飞书 fields 接口补建（幂等） */
  private async ensureReturnLinkField(): Promise<void> {
    try {
      const tableId = getTableId(RETURN_TABLE);
      const fields = await this.bitable.listFields(tableId);
      const exists = (fields || []).some((f: Record<string, unknown>) => f['field_name'] === RETURN_LINK_FIELD);
      if (exists) return;
      await this.bitable.createField(tableId, {
        field_name: RETURN_LINK_FIELD,
        type: 1,
      });
      this.logger.log(`已为 ${RETURN_TABLE} 补建字段「${RETURN_LINK_FIELD}」`);
    } catch (err) {
      this.logger.warn(`补建「${RETURN_LINK_FIELD}」字段失败（不阻断归还联动）: ${err instanceof Error ? err.message : err}`);
    }
  }

  private recordId(record: Record<string, unknown>): string {
    return String(record['_id'] || record['record_id'] || '');
  }
}
