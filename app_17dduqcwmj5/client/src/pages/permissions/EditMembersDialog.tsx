import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Switch } from '@client/src/components/ui/switch';
import { ChatSelect } from '@client/src/components/business-ui/chat-select';
import type { Chat } from '@client/src/components/business-ui/chat-select/types';
import { DepartmentSelect } from '@client/src/components/business-ui/department-select';
import type { Department } from '@client/src/components/business-ui/department-select/types';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { addRoleMembers, clearRoleMembers } from '@client/src/api';
import type {
  ForceRoleDTO,
  MemberMutationData,
} from '@shared/api.interface';

import { SPECIAL_MEMBER_ICONS } from './MemberSummary';

interface EditMembersDialogProps {
  role: ForceRoleDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditMembersDialog: React.FC<EditMembersDialogProps> = ({
  role,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [memberDepartments, setMemberDepartments] = useState<Department[]>([]);
  const [memberChats, setMemberChats] = useState<Chat[]>([]);
  const [isAdminEnabled, setIsAdminEnabled] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    const rm = role?.roleMembers;
    setMemberUserIds(
      (rm?.userList ?? [])
        .map((u) => u.userID)
        .filter((id): id is string => Boolean(id)),
    );
    setMemberDepartments(
      (rm?.departmentList ?? []).map((d) => ({
        id: d.id ?? '',
        name: d.name?.zh_cn ?? '',
      })),
    );
    setMemberChats(
      (rm?.groupChatList ?? []).map((c) => ({
        id: c.chatID ?? '',
        name: c.name?.zh_cn ?? '',
        avatar: c.avatar || '#1456F0',
      })),
    );
    setIsAdminEnabled(Boolean(rm?.presetGroup?.isContainsAdmin));
  }, [open, role]);

  const handleSave = async (): Promise<void> => {
    if (!role?.bizID) return;
    setSaving(true);
    try {
      await clearRoleMembers(role.bizID);
      const members: MemberMutationData = {
        userList: memberUserIds.map((userID) => ({ userID })),
        departmentList: memberDepartments.map((d) => ({ id: d.id })),
        groupChatList: memberChats.map((c) => ({ chatID: c.id })),
        isContainsAdmin: isAdminEnabled,
      };
      await addRoleMembers(role.bizID, { members });
      toast.success('角色成员已更新');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '保存失败，请稍后重试',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑成员 - {role?.name ?? ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">特殊成员范围</h4>
            <div className="flex flex-wrap gap-3">
              <div className="flex min-w-[220px] flex-1 items-center justify-between rounded-lg border p-3">
                <span className="flex items-center gap-2 text-sm">
                  {SPECIAL_MEMBER_ICONS.appDeveloper}
                  应用开发者
                </span>
                <Switch
                  checked={isAdminEnabled}
                  onCheckedChange={(checked: boolean) =>
                    setIsAdminEnabled(checked)
                  }
                />
              </div>
              {role?.roleMembers?.allEmployees ? (
                <div className="flex min-w-[220px] flex-1 items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    {SPECIAL_MEMBER_ICONS.allEmployees}
                    企业全员
                  </span>
                  <Switch checked disabled />
                </div>
              ) : null}
              {role?.roleMembers?.public ? (
                <div className="flex min-w-[220px] flex-1 items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    {SPECIAL_MEMBER_ICONS.public}
                    互联网公开
                  </span>
                  <Switch checked disabled />
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">指定成员</h4>
            <div>
              <div className="mb-1.5 text-sm text-muted-foreground">用户</div>
              <UserSelect
                multiple
                placeholder="添加用户"
                value={memberUserIds}
                onChange={(value) => setMemberUserIds(value)}
              />
            </div>
            <div>
              <div className="mb-1.5 text-sm text-muted-foreground">部门</div>
              <DepartmentSelect
                multiple
                placeholder="添加部门"
                value={memberDepartments}
                onChange={(value) =>
                  setMemberDepartments(Array.isArray(value) ? value : [])
                }
              />
            </div>
            <div>
              <div className="mb-1.5 text-sm text-muted-foreground">群组</div>
              <ChatSelect
                multiple
                valueType="object"
                placeholder="添加群组"
                value={memberChats}
                onChange={(value) => setMemberChats(value)}
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
