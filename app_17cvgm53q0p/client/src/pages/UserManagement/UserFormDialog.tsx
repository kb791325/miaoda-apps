import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { authApi } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import type { AppRole, AppUserWithRole } from '@shared/auth';
import { APP_USER_STATUS_DISABLED, APP_USER_STATUS_ENABLED } from '@shared/auth';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: AppUserWithRole | null;
  roles: AppRole[];
  onSaved: () => Promise<void>;
}

const UserFormDialog = ({
  open,
  onOpenChange,
  editingUser,
  roles,
  onSaved,
}: UserFormDialogProps) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setPassword('');
    if (editingUser) {
      setUsername(editingUser.username);
      setName(editingUser.name);
      setRoleId(editingUser.roleId);
      setPhone(editingUser.phone ?? '');
      setEnabled(editingUser.status === APP_USER_STATUS_ENABLED);
    } else {
      setUsername('');
      setName('');
      setRoleId('');
      setPhone('');
      setEnabled(true);
    }
  }, [open, editingUser]);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!roleId) {
      setError('请选择角色');
      return;
    }
    if (!editingUser && !password) {
      setError('请输入初始密码');
      return;
    }
    if (password && password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    const trimmedPhone: string = phone.trim();
    if (trimmedPhone && !/^1\d{10}$/.test(trimmedPhone)) {
      setError('手机号格式不正确，应为 11 位数字');
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        await authApi.updateUser(editingUser.id, {
          name: name.trim(),
          roleId,
          phone: phone.trim(),
          status: enabled ? APP_USER_STATUS_ENABLED : APP_USER_STATUS_DISABLED,
          ...(password ? { password } : {}),
        });
        toast.success('用户已更新');
      } else {
        await authApi.createUser({
          username: username.trim(),
          password,
          name: name.trim(),
          roleId,
          phone: phone.trim(),
        });
        toast.success('用户已创建');
      }
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      const data = (
        err as {
          response?: {
            data?: { message?: string; error?: { message?: string } };
          };
        }
      )?.response?.data;
      const message: string =
        data?.message ?? data?.error?.message ?? '保存失败，请稍后重试';
      setError(message);
      logger.error(`保存用户失败: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingUser ? '编辑用户' : '新增用户'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>用户名（登录名）</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="如 zhangsan"
              disabled={Boolean(editingUser)}
            />
            {!editingUser ? (
              <p className="text-xs text-muted-foreground">
                创建后不可修改，请确认后提交
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label>{editingUser ? '重置密码（留空则不修改）' : '初始密码'}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>姓名</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>联系电话</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="选填"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>角色</Label>
            <Select value={roleId || undefined} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择角色" />
              </SelectTrigger>
              <SelectContent>
                {(roles ?? []).map((role: AppRole) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editingUser ? (
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">账号状态</p>
                <p className="text-xs text-muted-foreground">
                  禁用后该账号无法登录系统
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
