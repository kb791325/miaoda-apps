export interface AppPermissionInfo {
  id: string;
  code: string;
  name: string;
  module: string;
  sortOrder: number;
}

export interface AppRole {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  roleId: string;
  phone: string;
  status: string;
  createdAt: string;
  authType: 'password' | 'feishu';
}

export interface AppUserWithRole extends AppUser {
  roleCode: string;
  roleName: string;
}

export interface UserOption {
  id: string;
  name: string;
  roleCode: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AppUserWithRole;
  permissions: string[];
}

export interface SessionResponse {
  user: AppUserWithRole;
  permissions: string[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  roleId: string;
  phone?: string;
}

export interface UpdateUserRequest {
  name?: string;
  roleId?: string;
  phone?: string;
  status?: string;
  password?: string;
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: string[];
}

export interface UserListResponse {
  items: AppUserWithRole[];
}

export interface RoleListResponse {
  items: AppRole[];
}

export interface PermissionListResponse {
  items: AppPermissionInfo[];
}

export interface UserOptionListResponse {
  items: UserOption[];
}

export const APP_USER_STATUS_ENABLED = '启用';
export const APP_USER_STATUS_DISABLED = '禁用';
