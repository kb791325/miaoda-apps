import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Settings2, ShieldCheck, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { authApi } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import RolePermissionDialog from './RolePermissionDialog';

import type { AppPermissionInfo, AppRole } from '@shared/auth';

const RolePermissionsPage = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<AppPermissionInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [permRole, setPermRole] = useState<AppRole | null>(null);
  const [permOpen, setPermOpen] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCode, setNewCode] = useState<string>('');
  const [createError, setCreateError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleItems, permItems] = await Promise.all([
        authApi.fetchRoles(),
        authApi.fetchPermissions(),
      ]);
      setRoles(Array.isArray(roleItems) ? roleItems : []);
      setPermissions(Array.isArray(permItems) ? permItems : []);
    } catch (err) {
      logger.error(`加载角色失败: ${err?.message ?? err}`);
      toast.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreateError('');
    if (!newName.trim() || !newCode.trim()) {
      setCreateError('请输入角色名称和编码');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(newCode.trim())) {
      setCreateError('编码仅限小写字母、数字、下划线，且以字母开头');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.createRole({
        name: newName.trim(),
        code: newCode.trim(),
        permissions: [],
      });
      toast.success('角色已创建，请为其配置权限');
      setCreateOpen(false);
      setNewName('');
      setNewCode('');
      await load();
    } catch (err) {
      const message: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '创建失败';
      setCreateError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: AppRole) => {
    try {
      await authApi.deleteRole(role.id);
      toast.success(`角色「${role.name}」已删除`);
      await load();
    } catch (err) {
      const message: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '删除失败';
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">角色权限</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            不同岗位的员工只显示和操作自己相关的功能
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-ai-section-type="button">
          <Plus className="mr-1 size-4" />
          新增角色
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            角色列表（{roles?.length ?? 0}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>权限数量</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || !roles ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    加载中…
                  </TableCell>
                </TableRow>
              ) : roles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    暂无角色
                  </TableCell>
                </TableRow>
              ) : (
                roles?.map((role: AppRole) => (
                  <TableRow key={role.id} className="h-12">
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {role.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isSystem ? 'default' : 'secondary'}>
                        {role.isSystem ? '系统角色' : '自定义'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.permissions?.length ?? 0} 项
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPermRole(role);
                            setPermOpen(true);
                          }}
                        >
                          <Settings2 className="mr-1 size-3.5" />
                          权限设置
                        </Button>
                        {!role.isSystem ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(role)}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <RolePermissionDialog
        open={permOpen}
        onOpenChange={setPermOpen}
        role={permRole}
        permissions={permissions}
        onSaved={load}
      />
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>角色名称</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="如 售后专员"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>角色编码</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="如 after_sales"
              />
            </div>
            {createError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? '创建中…' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolePermissionsPage;
