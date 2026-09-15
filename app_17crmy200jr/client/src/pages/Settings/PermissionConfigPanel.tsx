import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  RadioGroup,
  RadioGroupItem,
} from '@client/src/components/ui/radio-group';
import { Label } from '@client/src/components/ui/label';
import * as rolesApi from '@client/src/api/roles';
import type {
  RoleWithUserCount,
  MenuPermissions,
  DataPermissions,
  OperationPermissions,
  DataScope,
  Role,
} from '@shared/api.interface';

const BORDER = '#e2e8f0';
const PRIMARY = '#4a5568';

const MENU_GROUPS: Array<{
  title: string;
  items: Array<{ key: keyof MenuPermissions; label: string }>;
}> = [
  { title: '财务管理', items: [{ key: 'expenses', label: '行政支出' }, { key: 'budget', label: '预算管理' }] },
  { title: '资产管理', items: [{ key: 'fixedAssets', label: '固定资产' }] },
  { title: '盘点管理', items: [{ key: 'inventory', label: '资产盘点' }] },
  { title: '基础配置', items: [{ key: 'categories', label: '类目管理' }, { key: 'settings', label: '系统设置' }] },
  { title: '数据报表', items: [{ key: 'reports', label: '统计报表' }] },
  { title: '系统权限', items: [{ key: 'roles', label: '角色权限' }, { key: 'audit', label: '审计日志' }] },
  { title: '通知中心', items: [{ key: 'notifications', label: '消息通知' }] },
];

const DATA_DOMAINS: Array<{ key: keyof DataPermissions; label: string }> = [
  { key: 'expenses', label: '支出数据' },
  { key: 'fixedAssets', label: '资产数据' },
  { key: 'inventory', label: '盘点数据' },
];

const OPERATION_DOMAINS: Array<{
  key: keyof OperationPermissions;
  label: string;
  actions: string[];
}> = [
  { key: 'expenses', label: '支出管理', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'] },
  { key: 'fixedAssets', label: '资产管理', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'] },
  { key: 'inventory', label: '盘点管理', actions: ['view', 'create', 'edit', 'delete', 'export'] },
];

const ACTION_LABELS: Record<string, string> = {
  view: '查看', create: '新增', edit: '编辑', delete: '删除',
  approve: '审批', export: '导出', import: '导入',
};

const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  personal: '个人数据',
  department: '部门数据',
  all: '全部数据',
};

interface PermissionConfigPanelProps {
  roles: RoleWithUserCount[];
  onRoleUpdated?: () => void;
}

const PermissionConfigPanel: React.FC<PermissionConfigPanelProps> = ({
  roles,
  onRoleUpdated,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    roles.length > 0 ? roles[0].id : null,
  );
  const [roleDetail, setRoleDetail] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [menuPerms, setMenuPerms] = useState<MenuPermissions>({});
  const [dataPerms, setDataPerms] = useState<DataPermissions>({});
  const [opPerms, setOpPerms] = useState<OperationPermissions>({});

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data: Role = await rolesApi.getRoleDetail(id);
      setRoleDetail(data);
      setMenuPerms({ ...data.menuPermissions });
      setDataPerms({ ...data.dataPermissions });
      setOpPerms(JSON.parse(JSON.stringify(data.operationPermissions ?? {})));
    } catch (err: unknown) {
      logger.error('加载角色详情失败', err);
      toast.error('加载角色详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roles.length > 0 && !selectedId) {
      setSelectedId(roles[0].id);
    }
  }, [roles, selectedId]);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    }
  }, [selectedId, fetchDetail]);

  const selectedRole = roles.find((r: RoleWithUserCount) => r.id === selectedId);
  const isSystem = selectedRole?.isSystem ?? false;

  // 计算是否有改动
  const hasChanges = useMemo(() => {
    if (!roleDetail) return false;
    // 菜单权限对比
    const allMenuKeys = MENU_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    const menuChanged = allMenuKeys.some(
      (k) => !!menuPerms[k] !== !!roleDetail.menuPermissions[k],
    );
    if (menuChanged) return true;
    // 数据权限对比
    const dataChanged = DATA_DOMAINS.some(
      (d) => (dataPerms[d.key] ?? 'personal') !==
        (roleDetail.dataPermissions[d.key] ?? 'personal'),
    );
    if (dataChanged) return true;
    // 操作权限对比
    const opChanged = OPERATION_DOMAINS.some((domain) => {
      const current = (opPerms[domain.key] as Record<string, boolean>) ?? {};
      const original =
        (roleDetail.operationPermissions[domain.key] as Record<string, boolean>) ?? {};
      return domain.actions.some(
        (a) => !!current[a] !== !!original[a],
      );
    });
    return opChanged;
  }, [roleDetail, menuPerms, dataPerms, opPerms]);

  // ============ 菜单权限操作 ============
  const toggleMenuPerm = (key: keyof MenuPermissions) => {
    setMenuPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============ 数据权限操作 ============
  const setDataScope = (domain: keyof DataPermissions, value: DataScope) => {
    setDataPerms((prev) => ({ ...prev, [domain]: value }));
  };

  // ============ 操作权限操作 ============
  const toggleOpPerm = (domain: keyof OperationPermissions, action: string) => {
    setOpPerms((prev) => {
      const next: OperationPermissions = JSON.parse(JSON.stringify(prev));
      const domainObj = (next[domain] as Record<string, boolean>) ?? {};
      domainObj[action] = !domainObj[action];
      (next as Record<string, Record<string, boolean>>)[domain] = domainObj;
      return next;
    });
  };

  // ============ 保存 ============
  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await rolesApi.updateRole(selectedId, {
        menuPermissions: menuPerms,
        dataPermissions: dataPerms,
        operationPermissions: opPerms,
      });
      toast.success('权限配置保存成功');
      const data: Role = await rolesApi.getRoleDetail(selectedId);
      setRoleDetail(data);
      onRoleUpdated?.();
    } catch (err: unknown) {
      logger.error('保存权限配置失败', err);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = isSystem && !hasChanges ? true : !hasChanges;

  return (
    <div
      className="flex overflow-hidden rounded-sm border bg-card"
      style={{ borderColor: BORDER }}
    >
      {/* 左侧角色列表 */}
      <div
        className="flex w-[240px] shrink-0 flex-col border-r bg-muted/50"
        style={{ borderColor: BORDER }}
      >
        <div
          className="border-b px-4 py-3 text-sm font-medium text-foreground"
          style={{ borderColor: BORDER }}
        >
          选择角色
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {roles.map((role: RoleWithUserCount) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedId(role.id)}
              className={`relative flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                selectedId === role.id
                  ? 'bg-accent font-medium text-foreground/80'
                  : 'text-foreground/80 hover:bg-accent/50'
              }`}
            >
              {selectedId === role.id && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-sm"
                  style={{ backgroundColor: PRIMARY }}
                />
              )}
              <span className="truncate">{role.roleName}</span>
              {role.isSystem && (
                <Badge
                  variant="outline"
                  className="border-border bg-muted text-foreground text-[10px] px-1.5 py-0 h-4 ml-2 flex-shrink-0"
                >
                  系统
                </Badge>
              )}
            </button>
          ))}
          {roles.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              暂无角色
            </div>
          )}
        </div>
      </div>

      {/* 右侧权限配置区 */}
      <div className="flex flex-1 flex-col min-w-0">
        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            加载中...
          </div>
        )}
        {!loading && !roleDetail && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            请选择一个角色
          </div>
        )}
        {!loading && roleDetail && (
          <>
            <div
              className="border-b px-5 py-3"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-foreground">
                  {roleDetail.roleName}
                </span>
                {roleDetail.isSystem && (
                  <Badge
                    variant="outline"
                    className="border-border bg-muted text-foreground text-[10px] px-1.5 py-0 h-4"
                  >
                    系统角色
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                角色编码：{roleDetail.roleCode}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <Tabs defaultValue="menu" className="w-full">
                <TabsList className="mb-4" style={{ borderColor: BORDER }}>
                  <TabsTrigger value="menu">菜单权限</TabsTrigger>
                  <TabsTrigger value="data">数据权限</TabsTrigger>
                  <TabsTrigger value="operation">操作权限</TabsTrigger>
                </TabsList>

                {/* 菜单权限 */}
                <TabsContent value="menu">
                  <div className="grid grid-cols-2 gap-3">
                    {MENU_GROUPS.map((group) => (
                      <div
                        key={group.title}
                        className="rounded-sm border bg-card p-4"
                        style={{ borderColor: BORDER }}
                      >
                        <div className="mb-3 text-sm font-bold text-foreground">
                          {group.title}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={`cfg-menu-${String(item.key)}`}
                                checked={!!menuPerms[item.key]}
                                onCheckedChange={() => toggleMenuPerm(item.key)}
                              />
                              <Label
                                htmlFor={`cfg-menu-${String(item.key)}`}
                                className="cursor-pointer text-sm text-foreground/80"
                              >
                                {item.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* 数据权限 */}
                <TabsContent value="data">
                  <div className="space-y-3">
                    {DATA_DOMAINS.map((domain) => (
                      <div
                        key={domain.key}
                        className="rounded-sm border bg-card p-4"
                        style={{ borderColor: BORDER }}
                      >
                        <div className="mb-3 text-sm font-bold text-foreground">
                          {domain.label}
                        </div>
                        <RadioGroup
                          value={dataPerms[domain.key] ?? 'personal'}
                          onValueChange={(val: string) =>
                            setDataScope(domain.key, val as DataScope)
                          }
                          className="flex flex-row gap-6"
                        >
                          {(['personal', 'department', 'all'] as DataScope[]).map(
                            (scope) => (
                              <div
                                key={scope}
                                className="flex items-center gap-2"
                              >
                                <RadioGroupItem
                                  value={scope}
                                  id={`cfg-data-${domain.key}-${scope}`}
                                />
                                <Label
                                  htmlFor={`cfg-data-${domain.key}-${scope}`}
                                  className="cursor-pointer text-sm text-foreground/80"
                                >
                                  {DATA_SCOPE_LABELS[scope]}
                                </Label>
                              </div>
                            ),
                          )}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* 操作权限 */}
                <TabsContent value="operation">
                  <div className="space-y-3">
                    {OPERATION_DOMAINS.map((domain) => {
                      const domainPerms =
                        (opPerms[domain.key] as Record<string, boolean>) ?? {};
                      return (
                        <div
                          key={domain.key}
                          className="rounded-sm border bg-card p-4"
                          style={{ borderColor: BORDER }}
                        >
                          <div className="mb-3 text-sm font-bold text-foreground">
                            {domain.label}
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            {domain.actions.map((action: string) => (
                              <div
                                key={action}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`cfg-op-${domain.key}-${action}`}
                                  checked={!!domainPerms[action]}
                                  onCheckedChange={() =>
                                    toggleOpPerm(domain.key, action)
                                  }
                                />
                                <Label
                                  htmlFor={`cfg-op-${domain.key}-${action}`}
                                  className="cursor-pointer text-sm text-foreground/80"
                                >
                                  {ACTION_LABELS[action] ?? action}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* 底部操作栏 */}
            <div
              className="flex items-center justify-end border-t px-5 py-3"
              style={{ borderColor: BORDER }}
            >
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || saveDisabled}
                className="text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PermissionConfigPanel;
