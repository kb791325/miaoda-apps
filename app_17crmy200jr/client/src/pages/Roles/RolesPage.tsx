import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Shield,
  Plus,
  Trash2,
  Copy,
  Save,
  Settings,
  Users,
  Package,
  ClipboardCheck,
  BarChart3,
  Wallet,
  FileText,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@client/src/components/ui/card';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  RadioGroup,
  RadioGroupItem,
} from '@client/src/components/ui/radio-group';
import { Badge } from '@client/src/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import { Separator } from '@client/src/components/ui/separator';

import * as rolesApi from '@client/src/api/roles';
import type {
  Role,
  MenuPermissions,
  DataPermissions,
  OperationPermissions,
  DataScope,
} from '@shared/api.interface';

// 菜单权限分组配置
const MENU_GROUPS: Array<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ key: keyof MenuPermissions; label: string }>;
}> = [
  {
    title: '财务管理',
    icon: Wallet,
    items: [
      { key: 'expenses', label: '行政支出' },
      { key: 'budget', label: '预算管理' },
    ],
  },
  {
    title: '资产管理',
    icon: Package,
    items: [
      { key: 'fixedAssets', label: '固定资产' },
    ],
  },
  {
    title: '盘点管理',
    icon: ClipboardCheck,
    items: [
      { key: 'inventory', label: '资产盘点' },
    ],
  },
  {
    title: '基础配置',
    icon: Settings,
    items: [
      { key: 'categories', label: '类目管理' },
      { key: 'settings', label: '系统设置' },
    ],
  },
  {
    title: '数据报表',
    icon: BarChart3,
    items: [
      { key: 'reports', label: '统计报表' },
    ],
  },
  {
    title: '系统权限',
    icon: Shield,
    items: [
      { key: 'roles', label: '角色管理' },
      { key: 'audit', label: '审计日志' },
    ],
  },
  {
    title: '通知中心',
    icon: Bell,
    items: [
      { key: 'notifications', label: '消息通知' },
    ],
  },
];

// 数据权限业务域
const DATA_DOMAINS: Array<{ key: keyof DataPermissions; label: string }> = [
  { key: 'expenses', label: '支出数据' },
  { key: 'fixedAssets', label: '资产数据' },
  { key: 'inventory', label: '盘点数据' },
];

// 操作权限：业务域 × 操作类型
const OPERATION_DOMAINS: Array<{
  key: keyof OperationPermissions;
  label: string;
  actions: string[];
}> = [
  {
    key: 'expenses',
    label: '支出管理',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'],
  },
  {
    key: 'fixedAssets',
    label: '资产管理',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'],
  },
  {
    key: 'inventory',
    label: '盘点管理',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
  },
];

const ACTION_LABELS: Record<string, string> = {
  view: '查看',
  create: '新增',
  edit: '编辑',
  delete: '删除',
  approve: '审批',
  export: '导出',
  import: '导入',
};

const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  personal: '个人数据',
  department: '部门数据',
  all: '全部数据',
};

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 编辑态
  const [editRole, setEditRole] = useState<{
    roleCode: string;
    roleName: string;
    roleDescription: string;
    menuPermissions: MenuPermissions;
    dataPermissions: DataPermissions;
    operationPermissions: OperationPermissions;
  } | null>(null);

  // 新建弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    roleCode: '',
    roleName: '',
    roleDescription: '',
  });
  const [creating, setCreating] = useState(false);

  // 删除确认
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data: Role[] = await rolesApi.getRoleList();
      setRoles(data);
      if (data.length > 0 && (!selectedId || !data.find((r: Role) => r.id === selectedId))) {
        setSelectedId(data[0].id);
      }
    } catch (err: unknown) {
      logger.error('加载角色列表失败', err);
      toast.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchRoleDetail = useCallback(async (id: string) => {
    try {
      const data: Role = await rolesApi.getRoleDetail(id);
      setSelectedRole(data);
      setEditRole({
        roleCode: data.roleCode,
        roleName: data.roleName,
        roleDescription: data.roleDescription ?? '',
        menuPermissions: { ...data.menuPermissions },
        dataPermissions: { ...data.dataPermissions },
        operationPermissions: JSON.parse(JSON.stringify(data.operationPermissions ?? {})),
      });
    } catch (err: unknown) {
      logger.error('加载角色详情失败', err);
      toast.error('加载角色详情失败');
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (selectedId) {
      fetchRoleDetail(selectedId);
    }
  }, [selectedId, fetchRoleDetail]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // ============ 菜单权限操作 ============
  const toggleMenuPerm = (key: keyof MenuPermissions) => {
    if (!editRole) return;
    const next: MenuPermissions = { ...editRole.menuPermissions };
    next[key] = !next[key];
    setEditRole({ ...editRole, menuPermissions: next });
  };

  // ============ 数据权限操作 ============
  const setDataScope = (domain: keyof DataPermissions, value: DataScope) => {
    if (!editRole) return;
    const next: DataPermissions = { ...editRole.dataPermissions };
    next[domain] = value;
    setEditRole({ ...editRole, dataPermissions: next });
  };

  // ============ 操作权限操作 ============
  const toggleOperationPerm = (
    domain: keyof OperationPermissions,
    action: string,
  ) => {
    if (!editRole) return;
    const next: OperationPermissions = JSON.parse(JSON.stringify(editRole.operationPermissions));
    if (!next[domain]) {
      (next as Record<string, Record<string, boolean>>)[domain] = {};
    }
    const domainPerms = next[domain] as Record<string, boolean>;
    domainPerms[action] = !domainPerms[action];
    setEditRole({ ...editRole, operationPermissions: next });
  };

  // ============ 保存 ============
  const handleSave = async () => {
    if (!editRole || !selectedId) return;
    setSaving(true);
    try {
      // 系统角色不更新 code
      const payload: Parameters<typeof rolesApi.updateRole>[1] = {
        roleName: editRole.roleName,
        roleDescription: editRole.roleDescription,
        menuPermissions: editRole.menuPermissions,
        dataPermissions: editRole.dataPermissions,
        operationPermissions: editRole.operationPermissions,
      };
      if (!selectedRole?.isSystem) {
        payload.roleCode = editRole.roleCode;
      }
      await rolesApi.updateRole(selectedId, payload);
      toast.success('保存成功');
      await fetchRoles();
      await fetchRoleDetail(selectedId);
    } catch (err: unknown) {
      logger.error('保存角色失败', err);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ============ 复制 ============
  const handleCopy = async () => {
    if (!selectedId) return;
    try {
      const result: { id: string } = await rolesApi.copyRole(selectedId);
      toast.success('角色复制成功');
      await fetchRoles();
      setSelectedId(result.id);
    } catch (err: unknown) {
      logger.error('复制角色失败', err);
      toast.error('复制失败');
    }
  };

  // ============ 删除 ============
  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await rolesApi.deleteRole(selectedId);
      toast.success('删除成功');
      setDeleteOpen(false);
      setSelectedId(null);
      setSelectedRole(null);
      setEditRole(null);
      await fetchRoles();
    } catch (err: unknown) {
      logger.error('删除角色失败', err);
      toast.error('删除失败');
    }
  };

  // ============ 新建 ============
  const handleCreate = async () => {
    if (!newRole.roleCode || !newRole.roleName) {
      toast.error('请填写角色编码和角色名称');
      return;
    }
    setCreating(true);
    try {
      const result: { id: string } = await rolesApi.createRole({
        roleCode: newRole.roleCode,
        roleName: newRole.roleName,
        roleDescription: newRole.roleDescription,
        menuPermissions: {},
        dataPermissions: {},
        operationPermissions: {},
      });
      toast.success('创建成功');
      setCreateOpen(false);
      setNewRole({ roleCode: '', roleName: '', roleDescription: '' });
      await fetchRoles();
      setSelectedId(result.id);
    } catch (err: unknown) {
      logger.error('创建角色失败', err);
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-semibold mb-6">角色权限</h1>
      <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[600px]" data-ai-section-type="card-list">
      {/* 左侧角色列表 */}
      <Card className="w-1/3 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <CardTitle className="text-base">角色列表</CardTitle>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1" />
              新增
            </Button>
          </div>
          <CardDescription className="text-xs">
            共 {roles.length} 个角色
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {loading && <div className="p-4 text-sm text-muted-foreground">加载中...</div>}
          {!loading && roles.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">暂无角色</div>
          )}
          <div className="divide-y divide-border">
            {roles.map((role: Role) => (
              <div
                key={role.id}
                onClick={() => handleSelect(role.id)}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  selectedId === role.id
                    ? 'bg-accent border-l-2 border-l-primary pl-[14px]'
                    : 'hover:bg-accent/50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{role.roleName}</span>
                  {role.isSystem && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      系统
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {role.roleCode}
                </div>
                {role.roleDescription && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {role.roleDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 右侧详情面板 */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedRole && editRole ? (
          <>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{editRole.roleName}</CardTitle>
                  {selectedRole.isSystem && (
                    <Badge variant="outline" className="text-[10px]">
                      系统角色
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  角色编码：{editRole.roleCode}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto">
              <Tabs defaultValue="menu" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="menu">菜单权限</TabsTrigger>
                  <TabsTrigger value="data">数据权限</TabsTrigger>
                  <TabsTrigger value="operation">操作权限</TabsTrigger>
                </TabsList>

                {/* 基本信息 */}
                <div className="mb-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="roleCode">角色编码</Label>
                      <Input
                        id="roleCode"
                        value={editRole.roleCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditRole({ ...editRole, roleCode: e.target.value })
                        }
                        disabled={selectedRole.isSystem}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="roleName">角色名称</Label>
                      <Input
                        id="roleName"
                        value={editRole.roleName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditRole({ ...editRole, roleName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="roleDesc">角色描述</Label>
                    <Input
                      id="roleDesc"
                      value={editRole.roleDescription}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditRole({ ...editRole, roleDescription: e.target.value })
                      }
                      placeholder="请输入角色描述"
                    />
                  </div>
                </div>

                <Separator className="mb-4" />

                {/* 菜单权限 */}
                <TabsContent value="menu">
                  <div className="grid grid-cols-2 gap-4">
                    {MENU_GROUPS
                      .filter((g) => g.items.length > 0)
                      .map((group) => {
                        const Icon = group.icon;
                        return (
                          <div
                            key={group.title}
                            className="border border-border rounded-sm p-4 bg-card"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Icon className="size-4 text-primary" />
                              <span className="text-sm font-medium">{group.title}</span>
                            </div>
                            <div className="space-y-2">
                              {group.items.map((item) => (
                                <div
                                  key={item.key}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    id={`menu-${String(item.key)}`}
                                    checked={!!editRole.menuPermissions[item.key]}
                                    onCheckedChange={() => toggleMenuPerm(item.key)}
                                  />
                                  <Label
                                    htmlFor={`menu-${String(item.key)}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {item.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </TabsContent>

                {/* 数据权限 */}
                <TabsContent value="data">
                  <div className="space-y-4">
                    {DATA_DOMAINS.map((domain) => (
                      <div
                        key={domain.key}
                        className="border border-border rounded-sm p-4 bg-card"
                      >
                        <div className="text-sm font-medium mb-3">{domain.label}</div>
                        <RadioGroup
                          value={editRole.dataPermissions[domain.key] ?? 'personal'}
                          onValueChange={(val: string) =>
                            setDataScope(domain.key, val as DataScope)
                          }
                          className="flex flex-row gap-6"
                        >
                          {(['personal', 'department', 'all'] as DataScope[]).map((scope) => (
                            <div key={scope} className="flex items-center gap-2">
                              <RadioGroupItem value={scope} id={`data-${domain.key}-${scope}`} />
                              <Label
                                htmlFor={`data-${domain.key}-${scope}`}
                                className="text-sm cursor-pointer"
                              >
                                {DATA_SCOPE_LABELS[scope]}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* 操作权限 */}
                <TabsContent value="operation">
                  <div className="space-y-4">
                    {OPERATION_DOMAINS.map((domain) => (
                      <div
                        key={domain.key}
                        className="border border-border rounded-sm p-4 bg-card"
                      >
                        <div className="text-sm font-medium mb-3">{domain.label}</div>
                        <div className="grid grid-cols-4 gap-3">
                          {domain.actions.map((action: string) => {
                            const domainPerms = (
                              editRole.operationPermissions[domain.key] as Record<string, boolean>
                            ) ?? {};
                            return (
                              <div
                                key={action}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`op-${domain.key}-${action}`}
                                  checked={!!domainPerms[action]}
                                  onCheckedChange={() =>
                                    toggleOperationPerm(domain.key, action)
                                  }
                                />
                                <Label
                                  htmlFor={`op-${domain.key}-${action}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {ACTION_LABELS[action] ?? action}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="size-4 mr-1" />
                复制角色
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                disabled={selectedRole.isSystem}
              >
                <Trash2 className="size-4 mr-1" />
                删除
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="size-4 mr-1" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </CardFooter>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Shield className="size-12 mx-auto mb-3 opacity-30" />
              <div className="text-sm">请选择一个角色查看详情</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 新建角色弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
            <DialogDescription>
              创建新角色后，可在右侧面板配置详细权限。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-code">角色编码</Label>
              <Input
                id="new-code"
                value={newRole.roleCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewRole({ ...newRole, roleCode: e.target.value })
                }
                placeholder="如：finance_manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">角色名称</Label>
              <Input
                id="new-name"
                value={newRole.roleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewRole({ ...newRole, roleName: e.target.value })
                }
                placeholder="如：财务主管"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-desc">角色描述</Label>
              <Input
                id="new-desc"
                value={newRole.roleDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewRole({ ...newRole, roleDescription: e.target.value })
                }
                placeholder="选填"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除角色「{selectedRole?.roleName}」吗？删除后已分配该角色的用户将失去对应权限。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
};

export default RolesPage;
