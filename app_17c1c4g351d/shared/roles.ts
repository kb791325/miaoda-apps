export const ROLE_PROCUREMENT = 'procurement';
export const ROLE_OPERATIONS = 'operations';
export const ROLE_SUPERVISOR = 'supervisor';
export const ROLE_BOSS = 'boss';

export const ALL_ROLES = [ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS] as const;

export const ROUTE_ROLES: Record<string, string[]> = {
  '/': [ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS],
  '/products': [ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS],
  '/traffic': [ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS],
  '/customers': [ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS],
  '/aftersale': [ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS],
  '/inventory': [ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS],
  '/ai-review': [ROLE_SUPERVISOR, ROLE_BOSS],
  '/settings': [ROLE_SUPERVISOR, ROLE_BOSS],
};
