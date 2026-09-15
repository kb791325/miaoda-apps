import { Logger } from '@nestjs/common';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { BitableClient, readLinkIds } from '@server/common/utils/bitable-client';

const logger = new Logger('BitableSyncFollowUpLink');

/**
 * 客户表「跟进记录」字段名。跟进记录表「关联客户」与客户表「跟进记录」
 * 均为单向关联（bidirectional=false），API 无法改为双向，需在同步逻辑中手动维护。
 */
export const CUSTOMER_FOLLOW_UP_LINK_FIELD = '跟进记录';

/** 按客户聚合的反向关联变更：追加 / 移除跟进记录的 Base record_id */
export interface FollowUpLinkChanges {
  additions: Map<string, Set<string>>;
  removals: Map<string, Set<string>>;
}

export function emptyLinkChanges(): FollowUpLinkChanges {
  return { additions: new Map(), removals: new Map() };
}

export function addLinkChange(
  target: Map<string, Set<string>>,
  customerId: string,
  followUpRecordId: string,
): void {
  const set = target.get(customerId) ?? new Set<string>();
  set.add(followUpRecordId);
  target.set(customerId, set);
}

/**
 * 幂等维护客户表「跟进记录」反向关联：
 * 读取客户当前关联列表 → 应用移除/追加（去重）→ 仅在集合实际变化时写回。
 * 单个客户失败仅记录日志，不阻断整体同步。返回实际发生写回的客户数。
 */
export async function applyFollowUpCustomerLinks(
  bitable: BitableClient,
  changes: FollowUpLinkChanges,
): Promise<number> {
  const customerIds = new Set<string>([
    ...changes.additions.keys(),
    ...changes.removals.keys(),
  ]);
  let changedCustomers = 0;
  for (const customerId of customerIds) {
    try {
      const detail = await bitable.getRecord(
        CAPABILITY_INSTANCE_IDS.customerFollowUpLink,
        customerId,
      );
      const current = readLinkIds(
        detail.record?.[CUSTOMER_FOLLOW_UP_LINK_FIELD],
      );
      const removalSet = changes.removals.get(customerId) ?? new Set<string>();
      const additionSet =
        changes.additions.get(customerId) ?? new Set<string>();
      const next: string[] = [];
      for (const id of current) {
        if (!removalSet.has(id) && !next.includes(id)) next.push(id);
      }
      for (const id of additionSet) {
        if (!next.includes(id)) next.push(id);
      }
      const before = new Set(current);
      const same =
        before.size === next.length && next.every((id) => before.has(id));
      if (same) continue;
      await bitable.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.customerFollowUpLink, [
        {
          id: customerId,
          record: { [CUSTOMER_FOLLOW_UP_LINK_FIELD]: next },
        },
      ]);
      changedCustomers += 1;
      logger.log(
        `customer ${customerId} 跟进记录 link updated: ${current.length} -> ${next.length}`,
      );
    } catch (error) {
      logger.warn(
        `maintain customer ${customerId} 跟进记录 link failed: ${(error as Error).message}`,
      );
    }
  }
  return changedCustomers;
}
