import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Role,
  UserPermissions,
  UserRoleAssignment,
  MenuPermissions,
  DataPermissions,
  OperationPermissions,
  RoleUserItem,
  UserListResponse,
  RoleWithUserCount,
} from '@shared/api.interface';

export async function getRoleList(): Promise<RoleWithUserCount[]> {
  const response = await axiosForBackend({
    url: '/api/roles',
    method: 'GET',
  });
  return response.data;
}

export async function getRoleDetail(id: string): Promise<Role> {
  const response = await axiosForBackend({
    url: `/api/roles/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function createRole(data: {
  roleCode: string;
  roleName: string;
  roleDescription?: string;
  menuPermissions?: MenuPermissions;
  dataPermissions?: DataPermissions;
  operationPermissions?: OperationPermissions;
}): Promise<{ id: string }> {
  const response = await axiosForBackend({
    url: '/api/roles',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function updateRole(
  id: string,
  data: Partial<{
    roleCode: string;
    roleName: string;
    roleDescription: string;
    menuPermissions: MenuPermissions;
    dataPermissions: DataPermissions;
    operationPermissions: OperationPermissions;
  }>,
): Promise<Role> {
  const response = await axiosForBackend({
    url: `/api/roles/${id}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function deleteRole(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/roles/${id}`,
    method: 'DELETE',
  });
}

export async function copyRole(id: string): Promise<{ id: string }> {
  const response = await axiosForBackend({
    url: `/api/roles/${id}/copy`,
    method: 'POST',
  });
  return response.data;
}

export async function getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
  const response = await axiosForBackend({
    url: `/api/roles/users/${userId}`,
    method: 'GET',
  });
  return response.data;
}

export async function assignUserRoles(
  userId: string,
  roleIds: string[],
): Promise<{ success: boolean }> {
  const response = await axiosForBackend({
    url: `/api/roles/users/${userId}/roles`,
    method: 'POST',
    data: { roleIds },
  });
  return response.data;
}

export async function removeUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  await axiosForBackend({
    url: `/api/roles/users/${userId}/roles/${roleId}`,
    method: 'DELETE',
  });
}

export async function getMyPermissions(): Promise<UserPermissions> {
  const response = await axiosForBackend({
    url: '/api/roles/permissions/me',
    method: 'GET',
  });
  return response.data;
}

export async function getRoleUsers(roleId: string): Promise<RoleUserItem[]> {
  const response = await axiosForBackend({
    url: `/api/roles/${roleId}/users`,
    method: 'GET',
  });
  return response.data;
}

export async function getUserList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  roleId?: string;
}): Promise<UserListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.keyword) searchParams.set('keyword', params.keyword);
  if (params.roleId) searchParams.set('roleId', params.roleId);
  const response = await axiosForBackend({
    url: `/api/roles/users/list?${searchParams.toString()}`,
    method: 'GET',
  });
  return response.data;
}
