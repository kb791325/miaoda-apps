/** 双向同步共享常量与字段值转换助手 */

export type SyncEntityType =
  | 'follow_up'
  | 'shipment'
  | 'shipment_item'
  | 'customer_crm';

/** 订单表关联字段可读写实例（与 order v2 同一张表），拉取时解析发货单的关联订单 */
export const ORDER_LINK_INSTANCE_ID = 'bitable_order_1';

/** Base 侧客户等级/来源枚举与应用侧不一致，推送/拉取需经映射函数转换 */
export const BASE_CUSTOMER_GRADES = ['普通', 'VIP', '至尊'];

const GRADE_LOCAL_TO_BASE: Record<string, string> = {
  普通: '普通',
  重要: 'VIP',
  VIP: '至尊',
};

const GRADE_BASE_TO_LOCAL: Record<string, string> = {
  普通: '普通',
  VIP: '重要',
  至尊: 'VIP',
};

export function gradeToBase(localGrade: string): string | undefined {
  return GRADE_LOCAL_TO_BASE[localGrade];
}

export function gradeToLocal(baseGrade: string): string | undefined {
  return GRADE_BASE_TO_LOCAL[baseGrade];
}
export const BASE_CUSTOMER_SOURCES = [
  '抖音',
  '拼多多',
  '京东',
  '微信私域',
  '老客推荐',
];

/** 应用库发货状态 → Base 库存扣减状态 */
export const STOCK_STATUS_TO_BASE: Record<string, string> = {
  none: '待扣减',
  deducted: '已扣减',
};

/** Base 库存扣减状态 → 应用库（扣减失败不回写，避免库存不一致） */
export const BASE_STOCK_STATUS_TO_LOCAL: Record<string, string> = {
  待扣减: 'none',
  已扣减: 'deducted',
};

export function inEnum(value: string, options: readonly string[]): boolean {
  return options.includes(value);
}

export function toBaseMs(date: Date | null | undefined): number | undefined {
  return date ? date.getTime() : undefined;
}

/** 妙搭 userId（数字字符串）→ Base 人员字段 number[] */
export function toBaseUserIds(
  userId: string | null | undefined,
): number[] | undefined {
  if (!userId) return undefined;
  const num = Number(userId);
  return Number.isFinite(num) ? [num] : undefined;
}

export function readSelectField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Base 人员字段 number[] → 首个妙搭 userId 字符串 */
export function readUserFieldFirst(value: unknown): string {
  if (Array.isArray(value) && value.length > 0) {
    const first = Number(value[0]);
    return Number.isFinite(first) ? String(first) : '';
  }
  return '';
}
