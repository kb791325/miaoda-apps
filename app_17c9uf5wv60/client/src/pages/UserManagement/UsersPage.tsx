import { useCallback, useEffect, useState } from 'react';
import { userManagement } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
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
import { Checkbox } from '@client/src/components/ui/checkbox';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  ArrowRightToLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { UserWithRoles, Role } from '@shared/api.interface';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'disabled', label: '已禁用' },
];

const STATUS_STYLES: Record<string, string> = {
  active:
    'bg-[hsl(152_60%_42%_0.12)] text-[hsl(152_60%_38%)] border-[hsl(152_60%_42%_0.25)]',
  disabled:
    'bg-[hsl(220_10%_46%_0.12)] text-[hsl(220_10%_40%)] border-[hsl(220_10%_46%_0.25)]',
};

export default function UsersPage() {
  const [items, setItems] = useState<UserWithRoles[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await userManagement.getRoles();
      setRoles(res.items);
    } catch (err: unknown) {
      logger.error('获取角色列表失败:', String(err));
      toast.error('获取角色列表失败');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        keyword?: string;
        role?: string;
        status?: string;
      } = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await userManagement.getUsers(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取用户列表失败:', String(err));
      toast.error('获取用户列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, roleFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const roleNameMap = new Map(roles.map((r: Role) => [r.id, r.roleName]));

  const openAssignDialog = async (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles || []);
    setAssignOpen(true);
  };

  const handleToggleRole = (roleId: string, checked: boolean) => {
    setSelectedRoleIds((prev: string[]) =>
      checked ? [...prev, roleId] : prev.filter((id: string) => id !== roleId),
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await userManagement.assignUserRoles(selectedUser.userId, selectedRoleIds);
      toast.success('角色分配成功');
      setAssignOpen(false);
      fetchData();
    } catch (err: unknown) {
      logger.error('分配角色失败:', String(err));
      toast.error('分配角色失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">用户管理</h1>
          <p className="text-sm text-muted-foreground">查看系统用户并分配角色</p>
        </div>
      </div>

      <Card className="relative rounded-sm shadow-none border border-border overflow-hidden">
        <div className="absolute top-0 left-0 w-3 h-3 bg-primary" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="size-4 text-primary" />
              用户列表
              <span className="text-sm font-normal text-muted-foreground ml-1">
                共 <span className="font-mono font-light text-foreground">{total}</span> 位用户
              </span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名 / 用户ID"
                  value={keyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(val: string) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  {roles.map((r: Role) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(val: string) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="size-4 mr-2 animate-spin" />
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Users className="size-10 opacity-30" />
              <div>暂无已分配角色的用户</div>
              <div className="text-xs">请前往角色管理添加用户</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-border rounded-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[200px]">
                        用户信息
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-48">
                        邮箱
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[240px]">
                        角色
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-32">
                        部门
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-24">
                        状态
                      </th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-32">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((user: UserWithRoles) => (
                      <tr
                        key={user.userId}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2.5">
                          <UserDisplay value={[user.userId]} size="small" />
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {user.email || '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(user.roles || []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">未分配</span>
                            ) : (
                              (user.roles || []).map((roleId: string) => (
                                <Badge
                                  key={roleId}
                                  variant="secondary"
                                  className="rounded-full border text-xs font-normal"
                                >
                                  {roleNameMap.get(roleId) || roleId}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {user.department || '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={`rounded-full text-xs font-normal ${
                              STATUS_STYLES[user.status || 'active'] || ''
                            }`}
                          >
                            {user.status === 'disabled' ? '已禁用' : '活跃'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openAssignDialog(user)}
                          >
                            <Shield className="size-3.5" />
                            分配角色
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4 text-sm">
                  <span className="text-muted-foreground text-xs">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="rounded-sm border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">分配角色</DialogTitle>
            <DialogDescription className="text-xs">
              为用户分配系统角色，用户将拥有对应角色的所有权限
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border border-border rounded-sm bg-muted/20">
                <UserDisplay value={[selectedUser.userId]} size="medium" />
                <ArrowRightToLine className="size-4 ml-auto text-muted-foreground" />
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                <div className="text-sm font-medium text-foreground">选择角色</div>
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                    加载角色中...
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    暂无角色
                  </div>
                ) : (
                  <div className="space-y-1 border border-border rounded-sm divide-y divide-border">
                    {roles.map((r: Role) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={selectedRoleIds.includes(r.id)}
                          onCheckedChange={(checked: boolean) =>
                            handleToggleRole(r.id, checked)
                          }
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium">{r.roleName}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.roleCode} · {r.description || '暂无描述'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button size="sm" onClick={handleSaveRoles} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
