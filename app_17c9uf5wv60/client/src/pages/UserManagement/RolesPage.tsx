import { useCallback, useEffect, useState } from 'react';
import { userManagement } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Switch } from '@client/src/components/ui/switch';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import type {
  User,
  I18nText,
} from '@client/src/components/business-ui/user-select/types';
import {
  Shield,
  Users,
  Settings2,
  UserPlus,
  UserMinus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Role, UserWithRoles, PermissionsMap } from '@shared/api.interface';

const PERMISSION_MODULES: { key: string; name: string; actions: string[] }[] = [
  { key: 'dashboard', name: '库存看板', actions: ['view'] },
  { key: 'operations', name: '库存操作', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'aiTools', name: 'AI工具', actions: ['view', 'use'] },
  { key: 'records', name: '记录管理', actions: ['view', 'export'] },
  { key: 'products', name: '商品管理', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'suppliers', name: '供应商管理', actions: ['view', 'create', 'edit', 'delete'] },
  {
    key: 'salesOrders',
    name: '销售订单',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
  },
  { key: 'notifications', name: '通知中心', actions: ['view', 'manage'] },
  { key: 'auditLogs', name: '审计日志', actions: ['view', 'export'] },
  { key: 'syncSettings', name: '飞书同步', actions: ['view', 'manage'] },
  {
    key: 'userManagement',
    name: '用户管理',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'roleManagement',
    name: '角色管理',
    actions: ['view', 'create', 'edit', 'delete'],
  },
];

const ACTION_LABELS: Record<string, string> = {
  view: '查看', create: '新建', edit: '编辑', delete: '删除',
  export: '导出', approve: '审批', manage: '管理', use: '使用',
};

function resolveUserName(name?: I18nText | string): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.zh_cn || name.en_us || '';
}

function getOverviewModules(permissions: PermissionsMap): { name: string; hasView: boolean }[] {
  return PERMISSION_MODULES.slice(0, 6).map((m) => ({
    name: m.name,
    hasView: permissions[m.key]?.view === true,
  }));
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permDraft, setPermDraft] = useState<PermissionsMap>({});
  const [permSaving, setPermSaving] = useState(false);

  const [usersOpen, setUsersOpen] = useState(false);
  const [usersRole, setUsersRole] = useState<Role | null>(null);
  const [roleUsers, setRoleUsers] = useState<UserWithRoles[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [addUser, setAddUser] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await userManagement.getRoles();
      setRoles(res.items);
    } catch (err: unknown) {
      logger.error('获取角色列表失败:', String(err));
      toast.error('获取角色列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openPermDialog = async (role: Role) => {
    setPermRole(role);
    let detail: Role = role;
    try {
      detail = await userManagement.getRoleDetail(role.id);
    } catch (err: unknown) {
      logger.error('获取角色详情失败:', String(err));
    }
    setPermDraft(JSON.parse(JSON.stringify(detail.permissions || {})));
    setPermOpen(true);
  };

  const togglePermission = (moduleKey: string, action: string, checked: boolean) => {
    setPermDraft((prev: PermissionsMap) => {
      const next: PermissionsMap = { ...prev };
      const modulePerms = { ...(next[moduleKey] || {}) };
      modulePerms[action] = checked;
      next[moduleKey] = modulePerms;
      return next;
    });
  };

  const hasModuleAny = (moduleKey: string): boolean =>
    Object.values(permDraft[moduleKey] || {}).some(Boolean);

  const handleSavePermissions = async () => {
    if (!permRole) return;
    setPermSaving(true);
    try {
      await userManagement.updateRolePermissions(permRole.id, permDraft);
      toast.success('权限配置已保存');
      setPermOpen(false);
      fetchRoles();
    } catch (err: unknown) {
      logger.error('保存权限失败:', String(err));
      toast.error('保存权限失败');
    } finally {
      setPermSaving(false);
    }
  };

  const openUsersDialog = async (role: Role) => {
    setUsersRole(role);
    setUsersOpen(true);
    setRoleUsers([]);
    setAddUser(null);
    setUsersLoading(true);
    try {
      const list = await userManagement.getRoleUsers(role.id);
      setRoleUsers(list);
    } catch (err: unknown) {
      logger.error('获取角色用户失败:', String(err));
      toast.error('获取角色用户失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!usersRole || !addUser?.user_id) return;
    setAdding(true);
    try {
      await userManagement.addRoleUser(usersRole.id, {
        userId: addUser.user_id,
        userName: resolveUserName(addUser.name) || addUser.user_id,
      });
      toast.success('已添加用户');
      setAddUser(null);
      const list = await userManagement.getRoleUsers(usersRole.id);
      setRoleUsers(list);
      fetchRoles();
    } catch (err: unknown) {
      logger.error('添加用户失败:', String(err));
      toast.error('添加用户失败');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!usersRole) return;
    try {
      await userManagement.removeRoleUser(usersRole.id, userId);
      toast.success('已移除用户');
      setRoleUsers((prev: UserWithRoles[]) =>
        prev.filter((u: UserWithRoles) => u.userId !== userId),
      );
      fetchRoles();
    } catch (err: unknown) {
      logger.error('移除用户失败:', String(err));
      toast.error('移除用户失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">角色管理</h1>
          <p className="text-sm text-muted-foreground">配置系统角色权限与角色成员</p>
        </div>
      </div>

      <Card className="relative rounded-sm shadow-none border border-border overflow-hidden">
        <div className="absolute top-0 left-0 w-3 h-3 bg-primary" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              角色列表
              <span className="text-sm font-normal text-muted-foreground ml-1">
                共 <span className="font-mono font-light text-foreground">{roles.length}</span> 个角色
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="size-4 mr-2 animate-spin" />
              加载中...
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Shield className="size-10 opacity-30" />
              <div>暂无角色</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roles.map((role: Role) => {
                const overview = getOverviewModules(role.permissions || {});
                return (
                  <div
                    key={role.id}
                    className="relative border border-border rounded-sm bg-card p-4 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors group"
                  >
                    <div className="absolute top-0 left-0 w-2 h-2 bg-primary" />
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-base font-semibold text-foreground truncate">
                          {role.roleName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {role.roleCode}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full text-xs font-normal flex items-center gap-1 shrink-0 border-border"
                      >
                        <Users className="size-3" />
                        {role.userCount ?? 0}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2rem]">
                      {role.description || '暂无描述'}
                    </p>

                    <div className="space-y-1 mb-3">
                      <div className="text-[11px] text-muted-foreground mb-1">
                        权限概览
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {overview.map((o) => (
                          <span
                            key={o.name}
                            className={`text-[11px] px-1.5 py-0.5 rounded-full border ${
                              o.hasView
                                ? 'bg-[hsl(152_60%_42%_0.1)] text-[hsl(152_60%_38%)] border-[hsl(152_60%_42%_0.25)]'
                                : 'bg-muted/40 text-muted-foreground border-border'
                            }`}
                          >
                            {o.hasView && <CheckCircle2 className="size-2.5 inline mr-0.5 -mt-0.5" />}
                            {o.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => openPermDialog(role)}
                      >
                        <Settings2 className="size-3.5" />
                        配置权限
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => openUsersDialog(role)}
                      >
                        <Users className="size-3.5" />
                        查看用户
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配置权限弹窗 */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="rounded-sm border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">配置权限</DialogTitle>
            <DialogDescription className="text-xs">
              {permRole ? `${permRole.roleName} · ${permRole.roleCode}` : ''}
            </DialogDescription>
          </DialogHeader>

          {permRole && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {permRole.description && (
                <div className="text-sm text-muted-foreground border border-border rounded-sm p-3 bg-muted/20">
                  {permRole.description}
                </div>
              )}

              <div className="space-y-3">
                {PERMISSION_MODULES.map((m) => {
                  const moduleEnabled = hasModuleAny(m.key);
                  return (
                    <div key={m.key} className="border border-border rounded-sm overflow-hidden">
                      <div className={`px-3 py-2 flex items-center justify-between border-b border-border ${moduleEnabled ? 'bg-primary/[0.04]' : 'bg-muted/20'}`}>
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.key}
                        </span>
                      </div>
                      <div className="px-3 py-2 space-y-2">
                        {m.actions.map((action) => {
                          const checked = permDraft[m.key]?.[action] === true;
                          return (
                            <div
                              key={action}
                              className="flex items-center justify-between py-0.5"
                            >
                              <span className="text-sm text-foreground">
                                {ACTION_LABELS[action] || action}
                              </span>
                              <Switch
                                checked={checked}
                                onCheckedChange={(val: boolean) =>
                                  togglePermission(m.key, action, val)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPermOpen(false)}
              disabled={permSaving}
            >
              取消
            </Button>
            <Button size="sm" onClick={handleSavePermissions} disabled={permSaving}>
              {permSaving && <Loader2 className="size-4 animate-spin" />}
              保存权限
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看用户弹窗 */}
      <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
        <DialogContent className="rounded-sm border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">角色用户</DialogTitle>
            <DialogDescription className="text-xs">
              {usersRole ? `${usersRole.roleName} · ${usersRole.roleCode}` : ''}
            </DialogDescription>
          </DialogHeader>

          {usersRole && (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1.5">添加用户</div>
                  <UserSelect
                    value={addUser}
                    valueType="object"
                    onChange={(user: User) => setAddUser(user)}
                    triggerType="search"
                    placeholder="搜索并选择用户"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleAddUser}
                  disabled={!addUser?.user_id || adding}
                >
                  {adding ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  添加
                </Button>
              </div>

              <div className="border border-border rounded-sm max-h-[320px] overflow-y-auto">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground text-xs">
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                    加载中...
                  </div>
                ) : roleUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs gap-1">
                    <Users className="size-6 opacity-30" />
                    暂无用户
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {roleUsers.map((u: UserWithRoles) => (
                      <div
                        key={u.userId}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30"
                      >
                         <div className="flex-1 min-w-0">
                           <UserDisplay value={[u.userId]} size="small" />
                         </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveUser(u.userId)}
                        >
                          <UserMinus className="size-3.5" />
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUsersOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
