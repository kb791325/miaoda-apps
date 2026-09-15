import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PwdForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const INITIAL: PwdForm = { oldPassword: '', newPassword: '', confirmPassword: '' };

// 校验新密码强度：至少 8 位，且同时包含字母与数字
function validateNewPassword(pwd: string): string | null {
  if (pwd.length < 8) return '新密码长度至少为 8 位';
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return '新密码需同时包含字母和数字';
  return null;
}

export default function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [form, setForm] = useState<PwdForm>(INITIAL);
  const [errors, setErrors] = useState<Partial<PwdForm>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (patch: Partial<PwdForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleClose = () => {
    setForm(INITIAL);
    setErrors({});
    onOpenChange(false);
  };

  const validate = (): boolean => {
    const next: Partial<PwdForm> = {};
    if (!form.oldPassword.trim()) next.oldPassword = '请输入原密码';
    const pwdErr = validateNewPassword(form.newPassword);
    if (pwdErr) next.newPassword = pwdErr;
    else if (form.newPassword === form.oldPassword) next.newPassword = '新密码不能与原密码相同';
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = '两次输入的新密码不一致';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // 前端原型：模拟提交耗时
      await new Promise((r) => setTimeout(r, 600));
      toast.success('密码修改成功，下次登录请使用新密码');
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>为保障账户安全，新密码需包含字母和数字且不少于 8 位</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label><span className="text-destructive">*</span> 原密码</Label>
            <Input
              type="password"
              placeholder="请输入原密码"
              value={form.oldPassword}
              onChange={(e) => setField({ oldPassword: e.target.value })}
              className={errors.oldPassword ? 'border-destructive' : ''}
            />
            {errors.oldPassword && <p className="text-xs text-destructive">{errors.oldPassword}</p>}
          </div>
          <div className="space-y-1.5">
            <Label><span className="text-destructive">*</span> 新密码</Label>
            <Input
              type="password"
              placeholder="至少 8 位，包含字母和数字"
              value={form.newPassword}
              onChange={(e) => setField({ newPassword: e.target.value })}
              className={errors.newPassword ? 'border-destructive' : ''}
            />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
          </div>
          <div className="space-y-1.5">
            <Label><span className="text-destructive">*</span> 确认新密码</Label>
            <Input
              type="password"
              placeholder="请再次输入新密码"
              value={form.confirmPassword}
              onChange={(e) => setField({ confirmPassword: e.target.value })}
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '确定修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
