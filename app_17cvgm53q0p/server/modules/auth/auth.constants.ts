export interface PermissionDef {
  code: string;
  name: string;
  module: string;
}

export interface RoleDef {
  code: string;
  name: string;
  permissions: string[];
}

export const PERMISSION_DEFS: PermissionDef[] = [
  { code: 'dashboard:view', name: '查看仪表盘', module: '仪表盘' },
  { code: 'customer:view', name: '查看客户', module: '客户管理' },
  { code: 'customer:manage', name: '管理客户', module: '客户管理' },
  { code: 'followup:view', name: '查看跟进记录', module: '跟进记录' },
  { code: 'followup:manage', name: '新增跟进记录', module: '跟进记录' },
  { code: 'order:view', name: '查看订单', module: '订单管理' },
  { code: 'order:create', name: '创建订单', module: '订单管理' },
  { code: 'order:update', name: '编辑订单', module: '订单管理' },
  { code: 'order:delete', name: '删除订单', module: '订单管理' },
  { code: 'order:pay', name: '支付状态管理', module: '订单管理' },
  { code: 'shipment:view', name: '查看配送安装', module: '配送安装' },
  { code: 'shipment:outbound', name: '确认出库', module: '配送安装' },
  {
    code: 'shipment:install',
    name: '安装操作（开始安装/完成安装）',
    module: '配送安装',
  },
  { code: 'shipment:manage', name: '配送单管理', module: '配送安装' },
  { code: 'product:view', name: '查看商品库存', module: '商品库存' },
  { code: 'product:manage', name: '管理商品', module: '商品库存' },
  { code: 'cost:view', name: '查看成本价', module: '商品库存' },
  { code: 'price:manage', name: '修改价格与成本价', module: '商品库存' },
  { code: 'stock:manage', name: '库存出入库操作', module: '商品库存' },
  { code: 'stockflow:view', name: '查看库存流水', module: '商品库存' },
  { code: 'fee:view', name: '查看费用', module: '费用管理' },
  { code: 'fee:manage', name: '费用管理', module: '费用管理' },
  { code: 'report:finance', name: '财务利润报表', module: '财务报表' },
  { code: 'user:manage', name: '用户管理', module: '系统管理' },
  { code: 'role:manage', name: '角色权限管理', module: '系统管理' },
  { code: 'sync:manage', name: '数据同步运维', module: '系统管理' },
];

export const ALL_PERMISSION_CODES: string[] = PERMISSION_DEFS.map(
  (def: PermissionDef): string => def.code,
);

export const ROLE_DEFS: RoleDef[] = [
  { code: 'admin', name: '管理员', permissions: [...ALL_PERMISSION_CODES] },
  {
    code: 'sales',
    name: '销售',
    permissions: [
      'dashboard:view',
      'customer:view',
      'customer:manage',
      'followup:view',
      'followup:manage',
      'order:view',
      'order:create',
      'order:update',
      'product:view',
    ],
  },
  {
    code: 'warehouse',
    name: '仓库发货员',
    permissions: [
      'dashboard:view',
      'order:view',
      'product:view',
      'shipment:view',
      'shipment:outbound',
    ],
  },
  {
    code: 'installer',
    name: '安装人员',
    permissions: [
      'dashboard:view',
      'order:view',
      'shipment:view',
      'shipment:install',
    ],
  },
  {
    code: 'finance',
    name: '财务',
    permissions: [
      'dashboard:view',
      'customer:view',
      'order:view',
      'order:pay',
      'product:view',
      'cost:view',
      'price:manage',
      'fee:view',
      'fee:manage',
      'report:finance',
    ],
  },
  {
    code: 'inventory',
    name: '库管',
    permissions: [
      'dashboard:view',
      'product:view',
      'product:manage',
      'stock:manage',
      'stockflow:view',
    ],
  },
];

export const SYSTEM_ROLE_CODES: string[] = ROLE_DEFS.map(
  (def: RoleDef): string => def.code,
);

// 启动时需要将默认权限同步到存量数据的系统角色（权限配置曾调整过）
export const ROLES_SYNC_PERMISSIONS: string[] = ['warehouse', 'installer'];

export const JWT_SECRET = 'app-rbac-secret-app_17cvgm53q0p-2026';
export const TOKEN_EXPIRES_IN = '12h';
export const AUTH_COOKIE_NAME = 'app_auth_token';
export const AUTH_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'admin123';
