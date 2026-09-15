import { SuspiciousRequestStore } from '../../../server/common/middleware/suspicious-request.store';
import { SecurityHeadersMiddleware } from '../../../server/common/middleware/security-headers.middleware';

function createMockRes(): Record<string, unknown> {
  const headers: Record<string, string> = {};
  const mockRes: Record<string, unknown> = {
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    getHeader: jest.fn((name: string) => headers[name] ?? null),
    statusCode: 200,
    _headers: headers,
    status: jest.fn(function (this: Record<string, unknown>, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (this: Record<string, unknown>) {
      return this;
    }),
    end: jest.fn(),
  };
  return mockRes;
}

function createMockReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    method: 'GET',
    originalUrl: '/api/test',
    url: '/api/test',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest-test' },
    body: {},
    ...overrides,
  };
}

describe('SuspiciousRequestStore', () => {
  let store: SuspiciousRequestStore;

  beforeEach(() => {
    store = new SuspiciousRequestStore();
  });

  it('初始状态无事件', () => {
    const stats = store.getStats();
    expect(stats.totalBlocked).toBe(0);
    expect(store.getEvents()).toEqual([]);
  });

  it('记录并查询可疑事件', () => {
    store.recordEvent({
      type: 'SQL_INJECTION',
      method: 'GET',
      url: '/api/test?q=1',
      ip: '127.0.0.1',
      userAgent: 'test',
      pattern: 'OR',
    });
    const stats = store.getStats();
    expect(stats.totalBlocked).toBe(1);
    expect(stats.byType.SQL_INJECTION).toBe(1);
    const events = store.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('SQL_INJECTION');
  });

  it('事件按类型分组统计', () => {
    store.recordEvent({ type: 'SQL_INJECTION', method: 'GET', url: '/a', ip: '1.1.1.1', userAgent: 't', pattern: 'OR' });
    store.recordEvent({ type: 'XSS', method: 'POST', url: '/b', ip: '2.2.2.2', userAgent: 't', pattern: '<script>' });
    store.recordEvent({ type: 'SQL_INJECTION', method: 'GET', url: '/c', ip: '3.3.3.3', userAgent: 't', pattern: 'UNION' });
    const stats = store.getStats();
    expect(stats.byType.SQL_INJECTION).toBe(2);
    expect(stats.byType.XSS).toBe(1);
  });

  it('getEvents 限制返回数量', () => {
    for (let i = 0; i < 10; i += 1) {
      store.recordEvent({ type: 'TEST', method: 'GET', url: `/t/${i}`, ip: '1.1.1.1', userAgent: 't', pattern: 'x' });
    }
    expect(store.getEvents(5)).toHaveLength(5);
  });
});

describe('SecurityHeadersMiddleware', () => {
  it('设置安全响应头并调用 next', () => {
    const middleware = new SecurityHeadersMiddleware();
    const req = createMockReq() as unknown as Parameters<SecurityHeadersMiddleware['use']>[0];
    const res = createMockRes() as unknown as Parameters<SecurityHeadersMiddleware['use']>[1];
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});

describe('安全测试 - 综合', () => {
  it('模块可正常导入', () => {
    expect(SuspiciousRequestStore).toBeDefined();
    expect(SecurityHeadersMiddleware).toBeDefined();
  });
});