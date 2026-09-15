/* 前后端共享的类型写在这里 */

export type MarketingContentType =
  | 'enrollment_copy'
  | 'video_script'
  | 'moments'
  | 'poster_copy';

export type MarketingContentStatus =
  | 'pending_review'
  | 'available'
  | 'used'
  | 'rejected';

export interface MarketingContentEntity {
  id: string;
  title: string;
  courseId: string | null;
  contentType: MarketingContentType;
  body: string;
  status: MarketingContentStatus;
  scheduleDate: string | null;
  rejectReason: string | null;
  publishPlatform: string | null;
  likeCount: number | null;
  conversionCount: number | null;
  createdAt: string;
}

export type FaqMissStatus = 'pending' | 'converted';

export interface FaqMissEntity {
  id: string;
  question: string;
  status: FaqMissStatus;
  createdAt: string;
}

export type {
  ForceRoleDTO,
  RoleMemberDTO,
  MemberMutationData,
  MemberType,
  UserSimpleDTO,
  DepartmentDTO,
  ChatSimpleDTO,
  PresetGroupDTO,
  I18nText,
  CreateRoleResponse,
  ListMembersResponse,
} from '@lark-apaas/fullstack-nestjs-core';

import type { MemberMutationData } from '@lark-apaas/fullstack-nestjs-core';

/** POST /api/role_manager/roles */
export interface CreateRoleRequest {
  role: { name: string; description?: string; bizID: string };
}

/** PUT /api/role_manager/roles/:bizID */
export interface UpdateRoleRequest {
  role: { name?: string; description?: string };
}

/** POST /api/role_manager/roles/:bizID/members */
export interface AddMembersRequest {
  members: MemberMutationData;
}

/** POST /api/role_manager/roles/:bizID/members/batch_remove */
export interface RemoveMembersRequest {
  members: MemberMutationData;
}

/** POST /api/auth/my-roles — 前端权限 SDK 的角色拉取契约，data.roleList 结构为 SDK 约定 */
export interface MyRolesResponse {
  data: {
    roleList: string[];
  };
}