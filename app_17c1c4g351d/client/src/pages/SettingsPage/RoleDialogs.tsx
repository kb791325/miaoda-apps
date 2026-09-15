import type { FC } from 'react';
import {
  Trash2,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ForceRoleDTO } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface RoleFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  bizID: string;
  description: string;
  saving: boolean;
  onNameChange: (v: string) => void;
  onBizIDChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const RoleFormDialog: FC<RoleFormDialogProps> = ({
  open, mode, name, bizID, description, saving,
  onNameChange, onBizIDChange, onDescChange, onSave, onClose,
}) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? '添加角色' : '编辑角色信息'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? '创建新角色后，可在平台角色面板中为其分配成员'
            : '修改角色的名称和描述'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">角色名称</label>
          <Input placeholder="例如：运营主管" value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        {mode === 'create' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">角色标识</label>
            <Input placeholder="snake_case 格式，例如：ops_leader" value={bizID} onChange={(e) => onBizIDChange(e.target.value)} />
            <p className="text-xs text-muted-foreground">角色标识一旦创建不可修改，用于代码中的权限校验</p>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">角色描述</label>
          <Textarea placeholder="描述该角色的职责范围（可选）" value={description} onChange={(e) => onDescChange(e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
        <Button onClick={onSave} disabled={saving}>{saving ? '保存中...' : '确认'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface DeleteConfirmDialogProps {
  role: ForceRoleDTO | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: FC<DeleteConfirmDialogProps> = ({ role, onConfirm, onCancel }) => (
  <AlertDialog open={role !== null} onOpenChange={onCancel}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除角色</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除角色「{role?.name}」({role?.bizID})吗？此操作不可撤销。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          确认删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

interface RoleActionsProps {
  role: ForceRoleDTO;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  panelUrl: string;
}

export const RoleActions: FC<RoleActionsProps> = ({ role, canDelete, onEdit, onDelete, panelUrl }) => (
  <div className="flex items-center justify-end gap-1">
    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
      <UniversalLink to={panelUrl} target="_blank" rel="noopener noreferrer">编辑成员</UniversalLink>
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-3.5 mr-2" />
          编辑角色信息
        </DropdownMenuItem>
        {canDelete ? (
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="size-3.5 mr-2" />
            删除角色
          </DropdownMenuItem>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem disabled>
                <Trash2 className="size-3.5 mr-2" />
                删除角色
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent>包含企业全员/互联网公开的角色不支持删除</TooltipContent>
          </Tooltip>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
