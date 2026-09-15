import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ForceRoleDTO } from '@shared/api.interface';
import { getRoles, createRole, updateRole, deleteRole } from '@/api/role-manager';
import { RoleFormDialog, DeleteConfirmDialog, RoleActions } from './RoleDialogs';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

type DialogMode = 'create' | 'edit' | null;

export default function RoleManager() {
  const [roles, setRoles] = useState<ForceRoleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingRole, setEditingRole] = useState<ForceRoleDTO | null>(null);
  const [formName, setFormName] = useState('');
  const [formBizID, setFormBizID] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ForceRoleDTO | null>(null);

  const loadRoles = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      toast.error('加载角色列表失败');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles(true);
  }, [loadRoles]);

  const openCreate = () => {
    setFormName('');
    setFormBizID('');
    setFormDesc('');
    setEditingRole(null);
    setDialogMode('create');
  };

  const openEdit = (role: ForceRoleDTO) => {
    setFormName(role.name || '');
    setFormBizID(role.bizID || '');
    setFormDesc(role.description || '');
    setEditingRole(role);
    setDialogMode('edit');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingRole(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('请填写角色名称');
      return;
    }
    if (dialogMode === 'create' && !formBizID.trim()) {
      toast.error('请填写角色标识');
      return;
    }
    setSaving(true);
    try {
      if (dialogMode === 'create') {
        await createRole({
          role: { name: formName.trim(), bizID: formBizID.trim(), description: formDesc.trim() || undefined },
        });
        toast.success('角色创建成功');
      } else if (editingRole) {
        await updateRole(editingRole.bizID!, {
          role: { name: formName.trim(), description: formDesc.trim() || undefined },
        });
        toast.success('角色更新成功');
      }
      closeDialog();
      await loadRoles();
    } catch {
      toast.error(dialogMode === 'create' ? '创建角色失败' : '更新角色失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.bizID) return;
    try {
      await deleteRole(deleteTarget.bizID);
      toast.success('角色已删除');
      setDeleteTarget(null);
      await loadRoles();
    } catch {
      toast.error('删除角色失败');
    }
  };

  const canDeleteRole = (role: ForceRoleDTO): boolean =>
    !role.roleMembers?.allEmployees && !role.roleMembers?.public;

  const getMemberSummary = (role: ForceRoleDTO): string => {
    const members = role.roleMembers;
    if (!members) return '--';
    const parts: string[] = [];
    if (members.allEmployees) parts.push('企业全员');
    if (members.public) parts.push('互联网公开');
    if (members.presetGroup?.isContainsAdmin) parts.push('应用开发者');
    const userCount = members.userList?.length || 0;
    const deptCount = members.departmentList?.length || 0;
    const chatCount = members.groupChatList?.length || 0;
    if (userCount) parts.push(`${userCount} 位用户`);
    if (deptCount) parts.push(`${deptCount} 个部门`);
    if (chatCount) parts.push(`${chatCount} 个群组`);
    return parts.length > 0 ? parts.join('、') : '--';
  };

  const panelUrl = `${window.location.origin}${window.location.pathname}?openPanel=auth`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">角色列表</CardTitle>
              <CardDescription>
                管理应用角色与成员分配，点击「编辑成员」将跳转至平台角色面板
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <UniversalLink to={panelUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="size-3.5" />
                  平台角色面板
                </UniversalLink>
              </Button>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="size-3.5" />
                添加角色
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">角色名称</TableHead>
                <TableHead className="w-[200px]">角色标识</TableHead>
                <TableHead className="w-[300px]">角色描述</TableHead>
                <TableHead className="w-[250px]">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    成员概况
                  </span>
                </TableHead>
                <TableHead className="w-[120px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    暂无角色数据
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.bizID || role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{role.bizID}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {role.description || '--'}
                    </TableCell>
                    <TableCell className="text-sm">{getMemberSummary(role)}</TableCell>
                    <TableCell className="text-right">
                      <RoleActions
                        role={role}
                        canDelete={canDeleteRole(role)}
                        onEdit={() => openEdit(role)}
                        onDelete={() => setDeleteTarget(role)}
                        panelUrl={panelUrl}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={dialogMode !== null}
        mode={dialogMode || 'create'}
        name={formName}
        bizID={formBizID}
        description={formDesc}
        saving={saving}
        onNameChange={setFormName}
        onBizIDChange={setFormBizID}
        onDescChange={setFormDesc}
        onSave={handleSave}
        onClose={closeDialog}
      />

      <DeleteConfirmDialog
        role={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
