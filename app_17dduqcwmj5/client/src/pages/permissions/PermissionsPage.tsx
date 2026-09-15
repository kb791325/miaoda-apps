import React, { useCallback, useEffect, useState } from 'react';
import { MoreHorizontal, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  type TableProps,
} from '@lark-apaas/client-toolkit/antd-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/src/components/ui/tooltip';
import { deleteRole, fetchRoles } from '@client/src/api';
import type { ForceRoleDTO } from '@shared/api.interface';

import { EditMembersDialog } from './EditMembersDialog';
import { MemberSummary } from './MemberSummary';
import { RoleFormDialog } from './RoleFormDialog';

const canDeleteRole = (role: ForceRoleDTO): boolean =>
  !role.roleMembers?.allEmployees && !role.roleMembers?.public;

const PermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<ForceRoleDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [editRole, setEditRole] = useState<ForceRoleDTO | null>(null);
  const [membersRole, setMembersRole] = useState<ForceRoleDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ForceRoleDTO | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadRoles = useCallback(async (isInitial: boolean = false) => {
    try {
      if (isInitial) setLoading(true);
      const data: ForceRoleDTO[] = await fetchRoles();
      setRoles(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '加载角色列表失败',
      );
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles(true);
  }, [loadRoles]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget?.bizID) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.bizID);
      toast.success('角色已删除');
      setDeleteTarget(null);
      void loadRoles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '删除失败，请稍后重试',
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableProps<ForceRoleDTO>['columns'] = [
    { title: '角色名称', dataIndex: 'name', width: 180 },
    {
      title: '角色描述',
      dataIndex: 'description',
      width: 300,
      render: (text: string | undefined) => text || '--',
    },
    { title: '角色标识', dataIndex: 'bizID', width: 200 },
    {
      title: '角色成员',
      key: 'members',
      width: 250,
      render: (_: unknown, record: ForceRoleDTO) => (
        <MemberSummary role={record} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: ForceRoleDTO) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMembersRole(record)}
          >
            编辑成员
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditRole(record)}>
                编辑角色信息
              </DropdownMenuItem>
              {canDeleteRole(record) ? (
                <DropdownMenuItem
                  className="text-[hsl(5_75%_55%)] focus:text-[hsl(5_75%_55%)]"
                  onClick={() => setDeleteTarget(record)}
                >
                  删除角色
                </DropdownMenuItem>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem disabled>删除角色</DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    包含企业全员/互联网公开的角色不支持删除
                  </TooltipContent>
                </Tooltip>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">权限管理</h1>
              <p className="text-sm text-muted-foreground">
                管理应用角色，为成员分配对应权限
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-ai-section-type="button">
            <Plus className="size-4" />
            添加角色
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table<ForceRoleDTO>
              columns={columns}
              dataSource={roles}
              rowKey="bizID"
              pagination={false}
              scroll={{ x: 1080 }}
            />
          )}
        </div>

        <RoleFormDialog
          mode="create"
          role={null}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => void loadRoles()}
        />
        <RoleFormDialog
          mode="edit"
          role={editRole}
          open={editRole !== null}
          onOpenChange={(open: boolean) => {
            if (!open) setEditRole(null);
          }}
          onSuccess={() => void loadRoles()}
        />
        <EditMembersDialog
          role={membersRole}
          open={membersRole !== null}
          onOpenChange={(open: boolean) => {
            if (!open) setMembersRole(null);
          }}
          onSuccess={() => void loadRoles()}
        />

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open: boolean) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除角色</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除角色「{deleteTarget?.name ?? ''}」吗？已分配该角色的成员将失去对应权限，此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmDelete();
                }}
                disabled={deleting}
                className="bg-[hsl(5_75%_55%)] text-white hover:bg-[hsl(5_75%_48%)]"
              >
                {deleting ? '删除中...' : '删除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default PermissionsPage;
