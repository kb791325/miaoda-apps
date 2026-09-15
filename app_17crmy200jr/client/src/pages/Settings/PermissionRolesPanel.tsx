import { useState, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Search, Plus, Copy, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  copyRole,
} from '@client/src/api/roles';
import type { RoleWithUserCount } from '@shared/api.interface';

const BORDER = '#e2e8f0';
const PRIMARY = '#4a5568';

interface PermissionRolesPanelProps {
  roles: RoleWithUserCount[];
  onRolesChange?: (roles: RoleWithUserCount[]) => void;
}

interface FormState {
  roleCode: string;
  roleName: string;
  roleDescription: string;
}

const emptyForm: FormState = {
  roleCode: '',
  roleName: '',
  roleDescription: '',
};

const PermissionRolesPanel: React.FC<PermissionRolesPanelProps> = ({
  roles,
  onRolesChange,
}) => {
  const [keyword, setKeyword] = useState('');

  // 编辑/新增弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return roles;
    return roles.filter(
      (r: RoleWithUserCount) =>
        r.roleName.toLowerCase().includes(kw) ||
        r.roleCode.toLowerCase().includes(kw) ||
        (r.roleDescription ?? '').toLowerCase().includes(kw),
    );
  }, [roles, keyword]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (role: RoleWithUserCount) => {
    setEditingId(role.id);
    setForm({
      roleCode: role.roleCode,
      roleName: role.roleName,
      roleDescription: role.roleDescription ?? '',
    });
    setEditOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.roleCode.trim() || !form.roleName.trim()) {
      toast.error('请填写角色编码和角色名称');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateRole(editingId, {
          roleCode: form.roleCode.trim(),
          roleName: form.roleName.trim(),
          roleDescription: form.roleDescription.trim(),
        });
        toast.success('角色更新成功');
      } else {
        await createRole({
          roleCode: form.roleCode.trim(),
          roleName: form.roleName.trim(),
          roleDescription: form.roleDescription.trim() || undefined,
        });
        toast.success('角色创建成功');
      }
      setEditOpen(false);
      if (onRolesChange) {
        const latest: RoleWithUserCount[] = await getRoleList();
        onRolesChange(latest);
      }
    } catch (err: unknown) {
      logger.error('保存角色失败', err);
      toast.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (role: RoleWithUserCount) => {
    try {
      await copyRole(role.id);
      toast.success('角色复制成功');
      if (onRolesChange) {
        const latest: RoleWithUserCount[] = await getRoleList();
        onRolesChange(latest);
      }
    } catch (err: unknown) {
      logger.error('复制角色失败', err);
      toast.error('复制失败');
    }
  };

  const openDelete = (role: RoleWithUserCount) => {
    setDeletingId(role.id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRole(deletingId);
      toast.success('删除成功');
      setDeleteOpen(false);
      setDeletingId(null);
      if (onRolesChange) {
        const latest: RoleWithUserCount[] = await getRoleList();
        onRolesChange(latest);
      }
    } catch (err: unknown) {
      logger.error('删除角色失败', err);
      toast.error('删除失败');
    }
  };

  const deletingRole = roles.find((r: RoleWithUserCount) => r.id === deletingId);

  return (
    <div className="space-y-3">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索角色名称 / 编码..."
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKeyword(e.target.value)
            }
            className="pl-8"
            style={{ borderColor: BORDER }}
          />
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="text-white hover:opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="mr-1 h-4 w-4" />
          新增角色
        </Button>
      </div>

      {/* 表格 */}
      <div
        className="overflow-hidden rounded-sm border bg-card"
        style={{ borderColor: BORDER }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50" style={{ borderColor: BORDER }}>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                角色名称
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                角色编码
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                描述
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                用户数
              </th>
              <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                系统标记
              </th>
              <th className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRoles.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  暂无角色数据
                </td>
              </tr>
            )}
            {filteredRoles.map((role: RoleWithUserCount) => (
              <tr
                key={role.id}
                className="border-b transition-colors hover:bg-muted/50"
                style={{ borderColor: BORDER }}
              >
                <td className="h-10 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{role.roleName}</span>
                    {role.isSystem && (
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-foreground text-[10px] px-1.5 py-0 h-4"
                      >
                        系统
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="h-10 px-3 font-mono text-xs text-foreground/80">
                  {role.roleCode}
                </td>
                <td className="h-10 px-3 text-foreground/80">
                  {role.roleDescription || (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="h-10 px-3 text-foreground">{role.userCount}</td>
                <td className="h-10 px-3 text-muted-foreground">
                  {role.isSystem ? '是' : '否'}
                </td>
                <td className="h-10 px-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-foreground/80 hover:text-foreground"
                      onClick={() => openEdit(role)}
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-foreground/80 hover:text-foreground"
                      onClick={() => handleCopy(role)}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      复制
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      onClick={() => openDelete(role)}
                      disabled={role.isSystem}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑弹窗 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingId ? '编辑角色' : '新增角色'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? '修改角色基本信息，权限配置请在权限配置页操作。'
                : '创建新角色，创建后可在权限配置页分配详细权限。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-code" className="text-xs text-muted-foreground">
                角色编码
              </Label>
              <Input
                id="role-code"
                value={form.roleCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, roleCode: e.target.value })
                }
                placeholder="如：finance_manager"
                style={{ borderColor: BORDER }}
                disabled={!!editingId && deletingRole?.isSystem}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-name" className="text-xs text-muted-foreground">
                角色名称
              </Label>
              <Input
                id="role-name"
                value={form.roleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, roleName: e.target.value })
                }
                placeholder="如：财务主管"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc" className="text-xs text-muted-foreground">
                描述
              </Label>
              <Input
                id="role-desc"
                value={form.roleDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, roleDescription: e.target.value })
                }
                placeholder="选填"
                style={{ borderColor: BORDER }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              style={{ borderColor: BORDER }}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="text-white hover:opacity-90"
              style={{ backgroundColor: PRIMARY }}
            >
              {submitting ? '保存中...' : editingId ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base">确认删除</DialogTitle>
            <DialogDescription className="text-xs">
              确定要删除角色「{deletingRole?.roleName}」吗？
              删除后已分配该角色的用户将失去对应权限。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              style={{ borderColor: BORDER }}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionRolesPanel;
