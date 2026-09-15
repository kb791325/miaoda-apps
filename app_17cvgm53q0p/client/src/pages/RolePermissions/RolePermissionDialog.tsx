import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authApi } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import type { AppPermissionInfo, AppRole } from '@shared/auth';

interface RolePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AppRole | null;
  permissions: AppPermissionInfo[];
  onSaved: () => Promise<void>;
}

const RolePermissionDialog = ({
  open,
  onOpenChange,
  role,
  permissions,
  onSaved,
}: RolePermissionDialogProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isAdminRole = role?.code === 'admin';

  const modules = useMemo(() => {
    const grouped = new Map<string, AppPermissionInfo[]>();
    for (const perm of permissions ?? []) {
      const list = grouped.get(perm.module) ?? [];
      list.push(perm);
      grouped.set(perm.module, list);
    }
    return Array.from(grouped.entries());
  }, [permissions]);

  useEffect(() => {
    if (open && role) {
      setSelected(new Set(role.permissions ?? []));
    }
  }, [open, role]);

  const toggle = (code: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(code);
      } else {
        next.delete(code);
      }
      return next;
    });
  };

  const toggleModule = (items: AppPermissionInfo[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (checked) {
          next.add(item.code);
        } else {
          next.delete(item.code);
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!role) return;
    setSubmitting(true);
    try {
      await authApi.updateRole(role.id, {
        permissions: Array.from(selected),
      });
      toast.success('权限已保存');
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      const message: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '保存失败，请稍后重试';
      toast.error(message);
      logger.error(`保存角色权限失败: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>权限设置 · {role?.name}</DialogTitle>
          <DialogDescription>
            {isAdminRole
              ? '管理员拥有全部权限，不可调整'
              : '勾选该角色可使用的功能，保存后立即生效'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-auto pr-1">
          <div className="flex flex-col gap-4">
            {modules.map(([moduleName, items]) => {
              const moduleSelected = items.every((item) =>
                selected.has(item.code),
              );
              return (
                <div key={moduleName} className="rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                    <span className="text-sm font-medium">{moduleName}</span>
                    <Checkbox
                      checked={moduleSelected}
                      disabled={isAdminRole}
                      onCheckedChange={(checked) =>
                        toggleModule(items, checked === true)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4">
                    {items.map((item: AppPermissionInfo) => (
                      <label
                        key={item.code}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={selected.has(item.code)}
                          disabled={isAdminRole}
                          onCheckedChange={(checked) =>
                            toggle(item.code, checked === true)
                          }
                        />
                        <span>{item.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || isAdminRole}
          >
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RolePermissionDialog;
