import { useEffect, useState } from 'react';
import { rolesApi } from '@/api';

export interface RoleMenuConfig {
  menu_ids: string[];
}

function parseMenuIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  const s = String(raw ?? '').trim();
  if (!s) return [];
  try {
    const arr: unknown = JSON.parse(s);
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return s.split(/[,，;；\s]+/).filter(Boolean);
  }
}

/** 读取「系统-角色」表当前角色的菜单权限配置；admin 或未配置时返回 undefined（回退全量菜单，避免白屏） */
export function useRoleMenuConfig(role: string | undefined): RoleMenuConfig | undefined {
  const [config, setConfig] = useState<RoleMenuConfig | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!role || role === 'admin') {
      setConfig(undefined);
      return;
    }
    (async () => {
      try {
        const res = await rolesApi.list({ page: 1, pageSize: 100 });
        const rows: Array<Record<string, unknown>> = res?.data?.list || [];
        const hit = rows.find(
          (r) => String(r.role_key || '').trim().toLowerCase() === role.trim().toLowerCase(),
        );
        const menuIds = hit ? parseMenuIds(hit.menu_ids) : [];
        if (!cancelled) setConfig(menuIds.length > 0 ? { menu_ids: menuIds } : undefined);
      } catch {
        if (!cancelled) setConfig(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);
  return config;
}
