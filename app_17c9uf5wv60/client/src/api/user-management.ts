import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  RoleListResponse,
  Role,
  UpdateRolePermissionsRequest,
  AddRoleUserRequest,
  UserListResponse,
  UserListParams,
  UserWithRoles,
  AssignRolesRequest,
} from '@shared/api.interface';

export async function getRoles(): Promise<RoleListResponse> {
  const res = await axiosForBackend.get('/api/user-management/roles');
  return res.data;
}

export async function getRoleDetail(id: string): Promise<Role> {
  const res = await axiosForBackend.get(`/api/user-management/roles/${id}`);
  return res.data;
}

export async function updateRolePermissions(
  id: string,
  permissions: UpdateRolePermissionsRequest['permissions'],
): Promise<Role> {
  const res = await axiosForBackend.put(`/api/user-management/roles/${id}/permissions`, {
    permissions,
  });
  return res.data;
}

export async function getRoleUsers(roleId: string): Promise<UserWithRoles[]> {
  const res = await axiosForBackend.get(`/api/user-management/roles/${roleId}/users`);
  return res.data;
}

export async function addRoleUser(
  roleId: string,
  data: AddRoleUserRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post(`/api/user-management/roles/${roleId}/users`, data);
  return res.data;
}

export async function removeRoleUser(
  roleId: string,
  userId: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete(
    `/api/user-management/roles/${roleId}/users/${encodeURIComponent(userId)}`,
  );
  return res.data;
}

export async function getUsers(params: UserListParams): Promise<UserListResponse> {
  const res = await axiosForBackend.get('/api/user-management/users', { params });
  return res.data;
}

export async function getUserDetail(userId: string): Promise<UserWithRoles> {
  const res = await axiosForBackend.get(`/api/user-management/users/${encodeURIComponent(userId)}`);
  return res.data;
}

export async function assignUserRoles(
  userId: string,
  roleIds: string[],
): Promise<UserWithRoles> {
  const body: AssignRolesRequest = { roleIds };
  const res = await axiosForBackend.put(
    `/api/user-management/users/${encodeURIComponent(userId)}/roles`,
    body,
  );
  return res.data;
}
