import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

function MockAuthNPaasService() {}
jest.mock('@lark-apaas/fullstack-nestjs-core', () => {
  const actual = jest.requireActual('@lark-apaas/fullstack-nestjs-core');
  return {
    ...actual,
    AuthNPaasService: MockAuthNPaasService,
    DRIZZLE_DATABASE: 'DRIZZLE_DATABASE',
  };
});

// Mock @server/database/schema
jest.mock('@server/database/schema', () => {
  const makeCols = (names: string[]) =>
    Object.fromEntries(names.map((n) => [n, n]));
  return {
    roles: makeCols(['id', 'roleCode', 'roleName', 'roleDescription', 'isSystem', 'isActive', 'menuPermissions', 'dataPermissions', 'operationPermissions', 'createdAt', 'updatedAt']),
    userRoles: makeCols(['id', 'roleId', 'userId', 'isActive', 'createdAt']),
  };
}, { virtual: true });

import { RolesService } from '../../../server/modules/roles/roles.service';

// --------------- mock helpers ---------------

const resolveQueue: unknown[] = [];
let resolveIndex = 0;

const mockDb: Record<string, jest.Mock> = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
  $count: jest.fn(),
};

// Make mockDb thenable so `await chain` resolves via queue
Object.defineProperty(mockDb, 'then', {
  value: (resolve: (value: unknown) => void) => {
    resolve(resolveQueue[resolveIndex]);
    resolveIndex += 1;
  },
  writable: true,
});

const mockAuthn = {
  listUsersByIds: jest.fn().mockResolvedValue([]),
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockReturnValue({ redisStatus: 'fallback', memory: { keys: 0 } }),
};

function makeRoleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role-1',
    roleCode: 'admin',
    roleName: '管理员',
    roleDescription: '系统管理员',
    isSystem: false,
    isActive: true,
    menuPermissions: {},
    dataPermissions: {},
    operationPermissions: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeUserRoleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ur-1',
    userId: 'user-1',
    roleId: 'role-1',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function pushResolve(value: unknown) {
  resolveQueue.push(value);
}

function resetResolveQueue() {
  resolveQueue.length = 0;
  resolveIndex = 0;
}

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetResolveQueue();
    mockDb.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb),
    );
    service = new RolesService(mockDb as any, mockAuthn as any, mockCache as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== create ==========

  it('should create role', async () => {
    pushResolve([]); // select…where → no existing role
    pushResolve([{ id: 'new-role' }]); // insert…values…returning

    const result = await service.create({
      roleCode: 'editor',
      roleName: '编辑者',
    });

    expect(result).toEqual({ id: 'new-role' });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalled();
  });

  it('should handle duplicate role code', async () => {
    pushResolve([makeRoleRow({ roleCode: 'admin' })]); // select…where → existing

    await expect(
      service.create({ roleCode: 'admin', roleName: '管理员' }),
    ).rejects.toThrow(ConflictException);
  });

  // ========== update ==========

  it('should update role', async () => {
    pushResolve([makeRoleRow()]); // select…where → existing
    pushResolve([{ id: 'role-1' }]); // update…set…where…returning
    pushResolve([makeRoleRow({ roleName: '超级管理员' })]); // findOne at end

    const result = await service.update('role-1', {
      roleName: '超级管理员',
    });

    expect(result.roleName).toBe('超级管理员');
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
  });

  // ========== remove ==========

  it('should delete role', async () => {
    pushResolve([makeRoleRow()]); // select…where → existing
    pushResolve([{ id: 'role-1' }]); // delete…where…returning

    await service.remove('role-1');

    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('should handle system role deletion', async () => {
    pushResolve([makeRoleRow({ isSystem: true })]); // select…where → system role

    await expect(service.remove('role-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ========== findOne ==========

  it('should handle role not found', async () => {
    pushResolve([]); // select…where → empty

    await expect(service.findOne('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  // ========== assignUserRoles ==========

  it('should assign role to user', async () => {
    // transaction callback runs; inside tx:
    // 1. delete…where
    pushResolve(undefined);
    // 2. select…from…where → valid roles
    pushResolve([makeRoleRow()]);
    // 3. insert…values
    pushResolve(undefined);

    const result = await service.assignUserRoles('user-1', ['role-1']);

    expect(result).toEqual({ success: true });
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  // ========== getMyPermissions ==========

  it('should get user permissions', async () => {
    pushResolve([
      {
        ...makeRoleRow({
          menuPermissions: { expenses: true, reports: true },
          dataPermissions: { expenses: 'department' },
          operationPermissions: { expenses: { view: true, create: true } },
        }),
        userRoleId: 'ur-1',
      },
    ]);

    const result = await service.getMyPermissions('user-1');

    expect(result.menuPermissions).toEqual({
      expenses: true,
      reports: true,
    });
    expect(result.dataPermissions).toEqual({ expenses: 'department' });
    expect(result.operationPermissions).toEqual({
      expenses: { view: true, create: true },
    });
  });

  it('should validate menu permissions', async () => {
    pushResolve([
      {
        ...makeRoleRow({
          menuPermissions: { expenses: true, fixedAssets: true },
        }),
        userRoleId: 'ur-1',
      },
    ]);

    const result = await service.getMyPermissions('user-1');

    expect(result.menuPermissions.expenses).toBe(true);
    expect(result.menuPermissions.fixedAssets).toBe(true);
    expect(result.menuPermissions.inventory).toBeUndefined();
  });

  it('should validate operation permissions', async () => {
    pushResolve([
      {
        ...makeRoleRow({
          operationPermissions: {
            expenses: { view: true, edit: true, delete: false },
          },
        }),
        userRoleId: 'ur-1',
      },
    ]);

    const result = await service.getMyPermissions('user-1');
    const ops = result.operationPermissions as Record<
      string,
      Record<string, boolean>
    >;

    expect(ops.expenses.view).toBe(true);
    expect(ops.expenses.edit).toBe(true);
    expect(ops.expenses.delete).toBeFalsy();
  });

  // ========== getUserDataScope ==========

  it('should validate data permissions', async () => {
    pushResolve([
      {
        ...makeRoleRow({
          dataPermissions: { expenses: 'all', inventory: 'personal' },
        }),
        createdBy: undefined,
        updatedBy: undefined,
      },
    ]);

    const result = await service.getUserDataScope('user-1', 'expenses');

    expect(result).toBe('all');
  });

  // ========== findAll ==========

  it('should return all roles', async () => {
    pushResolve([
      makeRoleRow({ id: 'role-1', roleCode: 'admin' }),
      makeRoleRow({ id: 'role-2', roleCode: 'editor' }),
    ]);

    const result = await service.findAll();

    expect(result).toHaveLength(2);
    expect(result[0].roleCode).toBe('admin');
    expect(result[1].roleCode).toBe('editor');
  });

  // ========== findAllWithUserCount ==========

  it('should return roles with user count', async () => {
    pushResolve([
      {
        ...makeRoleRow(),
        userCount: '3',
      },
    ]);

    const result = await service.findAllWithUserCount();

    expect(result).toHaveLength(1);
    expect(result[0].userCount).toBe(3);
  });

  // ========== removeUserRole ==========

  it('should remove user role', async () => {
    pushResolve([{ id: 'ur-1' }]); // delete…where…returning

    await service.removeUserRole('user-1', 'role-1');

    expect(mockDb.delete).toHaveBeenCalled();
  });

  // ========== getRoleUsers ==========

  it('should get users by role', async () => {
    pushResolve([makeUserRoleRow()]); // select…from userRoles
    mockAuthn.listUsersByIds.mockResolvedValue([
      {
        name: { zh_cn: '张三' },
        department: '技术部',
        email: 'zhangsan@example.com',
      },
    ]);

    const result = await service.getRoleUsers('role-1');

    expect(result).toHaveLength(1);
    expect(result[0].userName).toBe('张三');
    expect(result[0].department).toBe('技术部');
  });
});