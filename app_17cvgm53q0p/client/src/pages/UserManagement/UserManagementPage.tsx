import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { authApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/use-auth';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import UserFormDialog from './UserFormDialog';

import type { AppRole, AppUserWithRole } from '@shared/auth';
import { APP_USER_STATUS_ENABLED } from '@shared/auth';

const formatDate = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUserWithRole[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AppUserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<AppUserWithRole | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userItems, roleItems] = await Promise.all([
        authApi.fetchUsers(),
        authApi.fetchRoles(),
      ]);
      setUsers(Array.isArray(userItems) ? userItems : []);
      setRoles(Array.isArray(roleItems) ? roleItems : []);
    } catch (err) {
      logger.error(`加载用户列表失败: ${err?.message ?? err}`);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (target: AppUserWithRole) => {
    if (target.id === currentUser?.id) {
      toast.error('不能禁用当前登录账号');
      return;
    }
    const nextStatus =
      target.status === APP_USER_STATUS_ENABLED ? '禁用' : '启用';
    try {
      await authApi.updateUser(target.id, { status: nextStatus });
      toast.success(`${target.name} 已${nextStatus}`);
      await load();
    } catch (err) {
      const message: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '操作失败';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await authApi.deleteUser(deletingUser.id);
      toast.success(`账号 ${deletingUser.name} 已删除`);
      setDeletingUser(null);
      await load();
    } catch (err) {
      const message: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '删除失败';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">用户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理系统账号，为每位员工分配对应岗位角色
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
          data-ai-section-type="button"
        >
          <Plus className="mr-1 size-4" />
          新增用户
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            账号列表（{users?.length ?? 0}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>账号类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || !users ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    加载中…
                  </TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    暂无用户
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((item: AppUserWithRole) => (
                  <TableRow key={item.id} className="h-12">
                    <TableCell className="font-mono text-sm">{item.username}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.roleName}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.phone || '-'}
                    </TableCell>
                    <TableCell>
                      {item.authType === 'feishu' ? (
                        <Badge
                          variant="secondary"
                          className="border border-blue-200 bg-blue-50 text-blue-700"
                        >
                          飞书账号
                        </Badge>
                      ) : (
                        <Badge variant="secondary">账密账号</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === APP_USER_STATUS_ENABLED
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(item);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 size-3.5" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={item.id === currentUser?.id}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.status === APP_USER_STATUS_ENABLED
                            ? '禁用'
                            : '启用'}
                        </Button>
                        {item.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeletingUser(item)}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            删除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingUser={editingUser}
        roles={roles}
        onSaved={load}
      />
      <Dialog
        open={deletingUser !== null}
        onOpenChange={(open: boolean) => {
          if (!open && !deleting) setDeletingUser(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>删除账号</DialogTitle>
            <DialogDescription>
              确定要删除账号「{deletingUser?.name}」
              （{deletingUser?.username}）吗？删除后该账号将无法登录系统。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeletingUser(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
