export interface AppUserContext {
  id: string;
  username: string;
  name: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  status: string;
  permissions: string[];
  authType: 'password' | 'feishu';
}

export interface OperatorContext {
  userId: string;
  roleCode: string;
  permissions: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    appUser?: AppUserContext;
  }
}
