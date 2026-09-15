import React from 'react';
import { Building, Globe, Users } from 'lucide-react';

import { Badge } from '@client/src/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@client/src/components/ui/hover-card';
import { ChatSelectTag } from '@client/src/components/business-ui/chat-select/chat-select-tag';
import { DepartmentSelectTag } from '@client/src/components/business-ui/department-select/department-select-tag';
import { ItemPill } from '@client/src/components/business-ui/entity-combobox/item-pill';
import { UserSelectTag } from '@client/src/components/business-ui/user-select/user-select-tag';
import type {
  ChatSimpleDTO,
  DepartmentDTO,
  ForceRoleDTO,
  UserSimpleDTO,
} from '@shared/api.interface';

const SPECIAL_ICON_BG = 'bg-primary';

const BrandCircleIcon: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span
    className={`flex items-center justify-center rounded-full ${SPECIAL_ICON_BG}`}
    style={{ width: 20, height: 20 }}
  >
    {children}
  </span>
);

export const SPECIAL_MEMBER_ICONS = {
  allEmployees: (
    <BrandCircleIcon>
      <Building className="h-3 w-3 text-primary-foreground" />
    </BrandCircleIcon>
  ),
  public: (
    <BrandCircleIcon>
      <Globe className="h-3 w-3 text-primary-foreground" />
    </BrandCircleIcon>
  ),
  appDeveloper: (
    <BrandCircleIcon>
      <Users className="h-3 w-3 text-primary-foreground" />
    </BrandCircleIcon>
  ),
};

type MemberItem =
  | { key: string; type: 'user'; data: UserSimpleDTO }
  | { key: string; type: 'dept'; data: DepartmentDTO }
  | { key: string; type: 'chat'; data: ChatSimpleDTO };

const TAG_CLASS = '!opacity-100 !cursor-default';
const MAX_DISPLAY = 3;

const renderMemberTag = (item: MemberItem): React.ReactNode => {
  if (item.type === 'user') {
    return (
      <UserSelectTag
        key={item.key}
        userValue={{
          id: item.data.userID ?? '',
          name: item.data.name?.zh_cn ?? '',
          avatar: item.data.avatar,
        }}
        onClose={() => {}}
        disabled
        className={TAG_CLASS}
      />
    );
  }
  if (item.type === 'dept') {
    return (
      <DepartmentSelectTag
        key={item.key}
        departmentValue={{
          id: item.data.id ?? '',
          name: item.data.name?.zh_cn ?? '',
        }}
        onClose={() => {}}
        disabled
        className={TAG_CLASS}
      />
    );
  }
  return (
    <ChatSelectTag
      key={item.key}
      chatValue={{
        id: item.data.chatID ?? '',
        name: item.data.name?.zh_cn ?? '',
        avatar: item.data.avatar || '#1456F0',
      }}
      onClose={() => {}}
      disabled
      className={TAG_CLASS}
    />
  );
};

export const MemberSummary: React.FC<{ role: ForceRoleDTO }> = ({ role }) => {
  const rm = role.roleMembers;
  if (!rm) return <>--</>;

  const memberItems: MemberItem[] = [
    ...(rm.userList ?? []).map((u: UserSimpleDTO) => ({
      key: u.userID ?? '',
      type: 'user' as const,
      data: u,
    })),
    ...(rm.departmentList ?? []).map((d: DepartmentDTO) => ({
      key: d.id ?? '',
      type: 'dept' as const,
      data: d,
    })),
    ...(rm.groupChatList ?? []).map((c: ChatSimpleDTO) => ({
      key: c.chatID ?? '',
      type: 'chat' as const,
      data: c,
    })),
  ];
  const visible: MemberItem[] = memberItems.slice(0, MAX_DISPLAY);
  const overflowCount: number = memberItems.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {rm.allEmployees ? (
        <ItemPill
          label="企业全员"
          avatar={SPECIAL_MEMBER_ICONS.allEmployees}
          avatarFallback={false}
          size="small"
        />
      ) : null}
      {rm.public ? (
        <ItemPill
          label="互联网公开"
          avatar={SPECIAL_MEMBER_ICONS.public}
          avatarFallback={false}
          size="small"
        />
      ) : null}
      {rm.presetGroup?.isContainsAdmin ? (
        <ItemPill
          label="应用开发者"
          avatar={SPECIAL_MEMBER_ICONS.appDeveloper}
          avatarFallback={false}
          size="small"
        />
      ) : null}
      {visible.map((item: MemberItem) => renderMemberTag(item))}
      {overflowCount > 0 ? (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Badge variant="outline" className="cursor-pointer">
              +{overflowCount}
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent className="max-w-[360px] w-auto p-2">
            <div className="flex flex-wrap gap-1">
              {memberItems
                .slice(MAX_DISPLAY)
                .map((item: MemberItem) => renderMemberTag(item))}
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : null}
      {rm.allEmployees === undefined &&
      rm.public === undefined &&
      !rm.presetGroup?.isContainsAdmin &&
      memberItems.length === 0 ? (
        <span>--</span>
      ) : null}
    </div>
  );
};
