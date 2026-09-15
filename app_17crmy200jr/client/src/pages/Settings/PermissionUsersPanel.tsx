import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Search, UserPlus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import * as rolesApi from '@client/src/api/roles';
import type { RoleUserItem, RoleWithUserCount } from '@shared/api.interface';

const BORDER = '#e2e8f0';

interface PermissionUsersPanelProps {
  roles: RoleWithUserCount[];
}

const PermissionUsersPanel = ({ roles }: PermissionUsersPanelProps) => {
  const [users, setUsers] = useState<RoleUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RoleUserItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolesApi.getUserList({
        page,
        pageSize,
        keyword: keyword || undefined,
        roleId: roleFilter || undefined,
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      logger.error('加载用户列表失败', err);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleEditUser = (user: RoleUserItem) => {
    setSelectedUser(user);
    setSelectedRoleIds([...user.roleIds]);
    setEditOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await rolesApi.assignUserRoles(selectedUser.userId, selectedRoleIds);
      toast.success('角色分配成功');
      setEditOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      logger.error('分配角色失败', err);
      toast.error('分配角色失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              className="pl-8"
              style={{ borderColor: BORDER }}
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40" style={{ borderColor: BORDER }}>
              <SelectValue placeholder="全部角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.roleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setKeyword('');
              setRoleFilter('');
              setPage(1);
            }}
            style={{ borderColor: BORDER }}
          >
            <Filter className="mr-1 h-4 w-4" />
            重置
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          共 <span className="font-medium text-foreground">{total}</span> 位用户
        </div>
      </div>

      <div
        className="overflow-hidden rounded-sm border bg-card"
        style={{ borderColor: BORDER }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50" style={{ borderColor: BORDER }}>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                用户
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                部门
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                角色
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                状态
              </th>
              <th className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="h-24 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="h-24 text-center text-muted-foreground">
                  暂无用户数据
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b transition-colors hover:bg-muted/50"
                  style={{ borderColor: BORDER }}
                >
                  <td className="h-10 px-3">
                    <UserDisplay value={[user.userId]} size="small" />
                  </td>
                  <td className="h-10 px-3 text-foreground/80">—</td>
                  <td className="h-10 px-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roleIds.map((rid) => {
                        const r = roles.find((role) => role.id === rid);
                        return r ? (
                          <Badge
                            key={rid}
                            variant="outline"
                            className="border-border bg-muted text-foreground"
                          >
                            {r.roleName}
                          </Badge>
                        ) : null;
                      })}
                      {user.roleIds.length === 0 && (
                        <span className="text-xs text-muted-foreground/70">未分配</span>
                      )}
                    </div>
                  </td>
                  <td className="h-10 px-3">
                    <Badge
                      variant="outline"
                      className={
                        user.isActive
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }
                    >
                      {user.isActive ? '正常' : '已禁用'}
                    </Badge>
                  </td>
                  <td className="h-10 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-foreground/80 hover:text-foreground"
                      onClick={() => handleEditUser(user)}
                    >
                      分配角色
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2" style={{ borderColor: BORDER }}>
            <span className="text-xs text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ borderColor: BORDER }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                style={{ borderColor: BORDER }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base">分配角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="flex items-center gap-3 rounded-sm border p-3" style={{ borderColor: BORDER }}>
                <UserDisplay value={[selectedUser.userId]} size="small" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">选择角色</Label>
              <div
                className="grid max-h-[240px] grid-cols-2 gap-2 overflow-y-auto rounded-sm border p-3"
                style={{ borderColor: BORDER }}
              >
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors ${
                      selectedRoleIds.includes(role.id)
                        ? 'ring-foreground/50 bg-accent'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="h-3.5 w-3.5 accent-[#4a5568]"
                    />
                    <span className="text-foreground">{role.roleName}</span>
                    {role.isSystem && (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        系统
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              style={{ borderColor: BORDER }}
            >
              取消
            </Button>
            <Button onClick={handleSaveRoles} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionUsersPanel;
