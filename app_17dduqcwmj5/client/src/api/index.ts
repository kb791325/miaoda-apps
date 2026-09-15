import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export * as bitableRetry from './bitable-retry';


// Add more API functions here, use axios instance (`axiosForBackend`) to make requests.
// 
// 使用示例：
// export async function getUserData(userId: string) {
//   try {
//     const response = await axiosForBackend({
//       url: `/api/users/${userId}`,
//       method: 'GET'
//     });
//     return response.data;
//   } catch (error) {
//     logger.error('获取用户数据失败', error);
//     throw error;
//   }
// }

import type {
  AddMembersRequest,
  CreateRoleRequest,
  CreateRoleResponse,
  ForceRoleDTO,
  ListMembersResponse,
  MemberType,
  RemoveMembersRequest,
  UpdateRoleRequest,
} from '@shared/api.interface';

const FORBIDDEN_ERROR = new Error('无操作权限，请联系校长分配角色');

type RoleApiResponse<T> = {
  status: number;
  data: T;
};

const guardForbidden = (status: number): void => {
  if (status === 403) {
    throw FORBIDDEN_ERROR;
  }
};

export const fetchRoles = async (): Promise<ForceRoleDTO[]> => {
  try {
    const response = await axiosForBackend({
      url: '/api/role_manager/roles',
      method: 'GET',
    }) as unknown as RoleApiResponse<ForceRoleDTO[]>;
    guardForbidden(response.status);
    return response.data;
  } catch (error) {
    logger.error('获取角色列表失败', error);
    throw error;
  }
};

export const createRole = async (
  payload: CreateRoleRequest,
): Promise<CreateRoleResponse> => {
  try {
    const response = await axiosForBackend({
      url: '/api/role_manager/roles',
      method: 'POST',
      data: payload,
    }) as unknown as RoleApiResponse<CreateRoleResponse>;
    guardForbidden(response.status);
    return response.data;
  } catch (error) {
    logger.error('创建角色失败', error);
    throw error;
  }
};

export const updateRole = async (
  bizID: string,
  payload: UpdateRoleRequest,
): Promise<void> => {
  try {
    const response = await axiosForBackend({
      url: `/api/role_manager/roles/${bizID}`,
      method: 'PUT',
      data: payload,
    }) as unknown as RoleApiResponse<unknown>;
    guardForbidden(response.status);
  } catch (error) {
    logger.error('更新角色失败', error);
    throw error;
  }
};

export const deleteRole = async (bizID: string): Promise<void> => {
  try {
    const response = await axiosForBackend({
      url: `/api/role_manager/roles/${bizID}`,
      method: 'DELETE',
    }) as unknown as RoleApiResponse<unknown>;
    guardForbidden(response.status);
  } catch (error) {
    logger.error('删除角色失败', error);
    throw error;
  }
};

export const fetchRoleMembers = async (
  bizID: string,
  type?: MemberType,
): Promise<ListMembersResponse> => {
  try {
    const response = await axiosForBackend({
      url: `/api/role_manager/roles/${bizID}/members`,
      method: 'GET',
      params: type ? { type } : {},
    }) as unknown as RoleApiResponse<ListMembersResponse>;
    guardForbidden(response.status);
    return response.data;
  } catch (error) {
    logger.error('获取角色成员失败', error);
    throw error;
  }
};

export const addRoleMembers = async (
  bizID: string,
  payload: AddMembersRequest,
): Promise<void> => {
  try {
    const response = await axiosForBackend({
      url: `/api/role_manager/roles/${bizID}/members`,
      method: 'POST',
      data: payload,
    }) as unknown as RoleApiResponse<unknown>;
    guardForbidden(response.status);
  } catch (error) {
    logger.error('添加角色成员失败', error);
    throw error;
  }
};

export const removeRoleMembers = async (
  bizID: string,
  payload: RemoveMembersRequest,
): Promise<void> => {
  try {
    const response = await axiosForBackend({
      url: `/api/role_manager/roles/${bizID}/members/batch_remove`,
      method: 'POST',
      data: payload,
    }) as unknown as RoleApiResponse<unknown>;
    guardForbidden(response.status);
  } catch (error) {
    logger.error('移除角色成员失败', error);
    throw error;
  }
};

export const clearRoleMembers = async (bizID: string): Promise<void> => {
  try {
    const response = await axiosForBackend({
      url: `/api/role_manager/roles/${bizID}/members`,
      method: 'DELETE',
    }) as unknown as RoleApiResponse<unknown>;
    guardForbidden(response.status);
  } catch (error) {
    logger.error('清空角色成员失败', error);
    throw error;
  }
};
