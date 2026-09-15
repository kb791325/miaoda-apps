import { useState, useEffect, useRef, useCallback } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit';

export interface DraftMeta {
  formType: string;      // 表单类型标识，如 'customer' / 'account_open'
  businessId: string;    // 业务id，新建用 'new'
  userId: string;        // 用户id
  data: Record<string, any>;
  savedAt: string;       // 保存时间 ISO
  summary: string;       // 摘要，用于草稿列表展示
}

const STORAGE_PREFIX = 'form_draft_';

function getKey(formType: string, userId: string, businessId: string): string {
  return `${STORAGE_PREFIX}${formType}_${userId}_${businessId}`;
}

/**
 * 表单草稿自动保存 hook
 * - 值变化延迟 1.5 秒自动写入 localStorage
 * - 打开表单时自动检测草稿
 * - 提交成功清除草稿
 */
export function useFormDraft(
  formType: string,
  businessId: string = 'new',
  options: {
    userId?: string;
    delay?: number;
    getSummary?: (values: Record<string, any>) => string;
  } = {},
) {
  const userId = options.userId ?? 'current';
  const delay = options.delay ?? 1500;
  const key = getKey(formType, userId, businessId);

  const [draft, setDraft] = useState<DraftMeta | null>(null);
  const timerRef = useRef<number | null>(null);

  // 初始读取
  useEffect(() => {
    try {
      const raw = scopedStorage.getItem(key);
      if (raw) {
        setDraft(JSON.parse(raw));
      } else {
        setDraft(null);
      }
    } catch {
      setDraft(null);
    }
  }, [key]);

  // 保存草稿
  const saveDraft = useCallback((values: Record<string, any>) => {
    const meta: DraftMeta = {
      formType,
      businessId,
      userId,
      data: values,
      savedAt: new Date().toISOString(),
      summary: options.getSummary?.(values) ?? '',
    };
    try {
      scopedStorage.setItem(key, JSON.stringify(meta));
      setDraft(meta);
    } catch {
      // ignore
    }
  }, [key, formType, businessId, userId, options]);

  // 延迟自动保存
  const scheduleAutoSave = useCallback((values: Record<string, any>) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      saveDraft(values);
    }, delay);
  }, [saveDraft, delay]);

  // 清除草稿
  const clearDraft = useCallback(() => {
    try {
      scopedStorage.removeItem(key);
    } catch {
      // ignore
    }
    setDraft(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [key]);

  // 组件卸载前 flush
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    draft,
    hasDraft: !!draft,
    saveDraft,
    scheduleAutoSave,
    clearDraft,
  };
}

/**
 * 获取当前用户的所有草稿列表
 */
export function getAllDrafts(userId: string = 'current'): DraftMeta[] {
  const list: DraftMeta[] = [];
  const prefix = `${STORAGE_PREFIX}`;
  try {
    for (let i = 0; i < scopedStorage.length; i++) {
      const k = scopedStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      // 简单过滤用户
      const raw = scopedStorage.getItem(k);
      if (!raw) continue;
      try {
        const item = JSON.parse(raw) as DraftMeta;
        if (item.userId === userId) {
          list.push(item);
        }
      } catch {
        // skip
      }
    }
  } catch {
    // ignore
  }
  // 按保存时间倒序
  return list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/**
 * 删除指定草稿
 */
export function deleteDraft(formType: string, userId: string, businessId: string): void {
  try {
    scopedStorage.removeItem(getKey(formType, userId, businessId));
  } catch {
    // ignore
  }
}

export const FORM_TYPE_LABELS: Record<string, string> = {
  customer: '新建客户',
  account_open: '新建开户申请',
  purchase_req: '新建采购申请',
  purchase: '新建采购申请',
  public_sea: '新建公海客资',
  contract: '新建合同',
  receipt: '新建收款',
  lead: '新建线索',
};

export const FORM_TYPE_ROUTES: Record<string, string> = {
  customer: '/customer/customers',
  account_open: '/advertising/account-open',
  purchase_req: '/admin/purchase-requisition',
  purchase: '/admin/purchase-requisition',
  public_sea: '/customer/public-sea',
  contract: '/contract/contracts',
  receipt: '/finance/receipts',
  lead: '/customer/clues',
};
