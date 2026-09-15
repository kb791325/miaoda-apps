import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  AppPermissionInfo,
  AppRole,
  AppUserWithRole,
  CreateRoleRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  PermissionListResponse,
  RoleListResponse,
  SessionResponse,
  UpdateRoleRequest,
  UpdateUserRequest,
  UserListResponse,
  UserOption,
  UserOptionListResponse,
} from '@shared/auth';

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const res = await axiosForBackend.post<LoginResponse>(
    '/api/auth/login',
    body,
  );
  return res.data;
}

export async function feishuLogin(): Promise<LoginResponse> {
  const res = await axiosForBackend.post<LoginResponse>(
    '/api/auth/feishu-login',
    {},
  );
  return res.data;
}

export async function logout(): Promise<void> {
  await axiosForBackend.post('/api/auth/logout', {});
}

export async function fetchSession(): Promise<SessionResponse> {
  const res = await axiosForBackend.get<SessionResponse>('/api/auth/me');
  return res.data;
}

export async function fetchUsers(): Promise<AppUserWithRole[]> {
  const res = await axiosForBackend.get<UserListResponse>('/api/auth/users');
  return res.data.items;
}

export async function fetchUserOptions(): Promise<UserOption[]> {
  const res = await axiosForBackend.get<UserOptionListResponse>(
    '/api/auth/user-options',
  );
  return res.data.items;
}

export async function createUser(
  body: CreateUserRequest,
): Promise<AppUserWithRole> {
  const res = await axiosForBackend.post<AppUserWithRole>(
    '/api/auth/users',
    body,
  );
  return res.data;
}

export async function updateUser(
  id: string,
  body: UpdateUserRequest,
): Promise<AppUserWithRole> {
  const res = await axiosForBackend.put<AppUserWithRole>(
    `/api/auth/users/${id}`,
    body,
  );
  return res.data;
}

export async function deleteUser(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `/api/auth/users/${id}`,
  );
  return res.data;
}

export async function fetchRoles(): Promise<AppRole[]> {
  const res = await axiosForBackend.get<RoleListResponse>('/api/auth/roles');
  return res.data.items;
}

export async function createRole(body: CreateRoleRequest): Promise<AppRole> {
  const res = await axiosForBackend.post<AppRole>(
    '/api/auth/roles',
    body,
  );
  return res.data;
}

export async function updateRole(
  id: string,
  body: UpdateRoleRequest,
): Promise<AppRole> {
  const res = await axiosForBackend.put<AppRole>(
    `/api/auth/roles/${id}`,
    body,
  );
  return res.data;
}

export async function deleteRole(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete<{ success: boolean }>(
    `/api/auth/roles/${id}`,
  );
  return res.data;
}

export async function fetchPermissions(): Promise<AppPermissionInfo[]> {
  const res = await axiosForBackend.get<PermissionListResponse>(
    '/api/auth/permissions',
  );
  return res.data.items;
}
