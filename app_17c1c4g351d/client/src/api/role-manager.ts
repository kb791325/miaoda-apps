import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ForceRoleDTO,
  CreateRoleRequest,
  UpdateRoleRequest,
  AddMembersRequest,
  RemoveMembersRequest,
  SearchMembersRequest,
} from '@shared/api.interface';

export async function getRoles(): Promise<ForceRoleDTO[]> {
  const res = await axiosForBackend.get<ForceRoleDTO[]>('/api/role-manager/roles');
  return res.data;
}

export async function getRole(bizID: string): Promise<ForceRoleDTO> {
  const res = await axiosForBackend.get<ForceRoleDTO>(`/api/role-manager/roles/${bizID}`);
  return res.data;
}

export async function createRole(data: CreateRoleRequest): Promise<{ bizID: string; apiID: string }> {
  const res = await axiosForBackend.post('/api/role-manager/roles', data);
  return res.data;
}

export async function updateRole(bizID: string, data: UpdateRoleRequest): Promise<void> {
  await axiosForBackend.put(`/api/role-manager/roles/${bizID}`, data);
}

export async function deleteRole(bizID: string): Promise<void> {
  await axiosForBackend.delete(`/api/role-manager/roles/${bizID}`);
}

export async function getRoleMembers(
  bizID: string,
  params?: { type?: string; page?: number; pageSize?: number },
) {
  const res = await axiosForBackend.get(`/api/role-manager/roles/${bizID}/members`, { params });
  return res.data;
}

export async function addRoleMembers(bizID: string, data: AddMembersRequest): Promise<void> {
  await axiosForBackend.post(`/api/role-manager/roles/${bizID}/members`, data);
}

export async function removeRoleMembers(bizID: string, data: RemoveMembersRequest): Promise<void> {
  await axiosForBackend.post(`/api/role-manager/roles/${bizID}/members/batch_remove`, data);
}

export async function clearRoleMembers(bizID: string): Promise<void> {
  await axiosForBackend.delete(`/api/role-manager/roles/${bizID}/members`);
}

export async function searchMembers(data: SearchMembersRequest) {
  const res = await axiosForBackend.post('/api/role-manager/search', data);
  return res.data;
}
