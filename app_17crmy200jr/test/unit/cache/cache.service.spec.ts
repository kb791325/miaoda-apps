import { Test, type TestingModule } from '@nestjs/testing';
import { CacheService } from '../../../server/common/cache/cache.service';
import { MemoryCacheService } from '../../../server/common/cache/memory-cache.service';

const mockCacheConfig = {
  host: 'localhost',
  port: 6379,
  password: undefined,
  db: 0,
  ttl: 300,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  fallbackToMemory: true,
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const mockRedis = {
      status: 'connecting',
      connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      pexpire: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      flushdb: jest.fn(),
    };
    return mockRedis;
  });
});

describe('CacheService', () => {
  let service: CacheService;
  let memoryCache: MemoryCacheService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryCacheService,
        {
          provide: 'cache',
          useValue: mockCacheConfig,
        },
        CacheService,
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    memoryCache = module.get<MemoryCacheService>(MemoryCacheService);

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('get / set 基本读写', () => {
    it('set 后 get 应返回相同值', async () => {
      await service.set('test:key1', { name: 'hello' });
      const result = await service.get<{ name: string }>('test:key1');
      expect(result).toEqual({ name: 'hello' });
    });

    it('get 不存在的 key 应返回 null', async () => {
      const result = await service.get('nonexistent');
      expect(result).toBeNull();
    });

    it('set 支持自定义 TTL', async () => {
      await service.set('test:ttl', 'value', 50);
      const result = await service.get<string>('test:ttl');
      expect(result).toBe('value');
    });
  });

  describe('del 删除', () => {
    it('删除存在的 key 返回 true', async () => {
      await service.set('test:del1', 'data');
      const result = await service.del('test:del1');
      expect(result).toBe(true);
      const after = await service.get('test:del1');
      expect(after).toBeNull();
    });

    it('删除不存在的 key 返回 false', async () => {
      const result = await service.del('test:nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('exists 存在检查', () => {
    it('存在的 key 返回 true', async () => {
      await service.set('test:exists', 'data');
      const result = await service.exists('test:exists');
      expect(result).toBe(true);
    });

    it('不存在的 key 返回 false', async () => {
      const result = await service.exists('test:noexists');
      expect(result).toBe(false);
    });
  });

  describe('缓存过期（TTL）', () => {
    it('过期后 get 应返回 null', async () => {
      await service.set('test:expire', 'temp', 10);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = await service.get('test:expire');
      expect(result).toBeNull();
    });

    it('expire 方法可设置新 TTL', async () => {
      await service.set('test:expire2', 'renew', 5000);
      const renewed = await service.expire('test:expire2', 60000);
      expect(renewed).toBe(true);
      const result = await service.get<string>('test:expire2');
      expect(result).toBe('renew');
    });

    it('expire 不存在的 key 返回 false', async () => {
      const result = await service.expire('test:no', 1000);
      expect(result).toBe(false);
    });
  });

  describe('flush 清空', () => {
    it('清空后所有 key 不存在', async () => {
      await service.set('test:flush1', 'a');
      await service.set('test:flush2', 'b');
      await service.flush();
      const r1 = await service.get('test:flush1');
      const r2 = await service.get('test:flush2');
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });
  });

  describe('incr / decr 计数器', () => {
    it('incr 从 0 开始递增', async () => {
      const v1 = await service.incr('test:counter');
      expect(v1).toBe(1);
      const v2 = await service.incr('test:counter');
      expect(v2).toBe(2);
      const v3 = await service.incr('test:counter');
      expect(v3).toBe(3);
    });

    it('decr 递减', async () => {
      await service.set('test:dec', 10);
      const v1 = await service.decr('test:dec');
      expect(v1).toBe(9);
      const v2 = await service.decr('test:dec');
      expect(v2).toBe(8);
    });

    it('decr 从 0 开始变为负数', async () => {
      const v1 = await service.decr('test:neg');
      expect(v1).toBe(-1);
    });
  });

  describe('deleteByPrefix / deleteByPattern', () => {
    it('deleteByPrefix 删除匹配前缀的所有 key', async () => {
      await service.set('prefix:a', 1);
      await service.set('prefix:b', 2);
      await service.set('prefix:c', 3);
      await service.set('other:d', 4);
      const removed = await service.deleteByPrefix('prefix:');
      expect(removed).toBe(3);
      const a = await service.get('prefix:a');
      expect(a).toBeNull();
      const d = await service.get<number>('other:d');
      expect(d).toBe(4);
    });

    it('deleteByPattern 删除匹配模式的所有 key', async () => {
      await service.set('user:1:cache', 'x');
      await service.set('user:2:cache', 'y');
      await service.set('user:3:data', 'z');
      const removed = await service.deleteByPattern('user:*:cache');
      expect(removed).toBe(2);
      const z = await service.get<string>('user:3:data');
      expect(z).toBe('z');
    });

    it('deleteByPrefix 无匹配时返回 0', async () => {
      const removed = await service.deleteByPrefix('nonexistent:');
      expect(removed).toBe(0);
    });
  });

  describe('命中率统计', () => {
    it('getStats 返回命中率数据', async () => {
      await service.set('stats:key', 'val');
      await service.get('stats:key');
      await service.get('stats:missing');
      const stats = service.getStats();
      expect(stats.memory.hits).toBeGreaterThanOrEqual(0);
      expect(stats.memory.misses).toBeGreaterThanOrEqual(0);
      expect(stats.memory.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.redisStatus).toBe('fallback');
    });

    it('getHitRateStats 返回详细命中率', () => {
      const hitRate = service.getHitRateStats();
      expect(hitRate).toHaveProperty('hits');
      expect(hitRate).toHaveProperty('misses');
      expect(hitRate).toHaveProperty('total');
      expect(hitRate).toHaveProperty('hitRate');
      expect(hitRate.total).toBe(hitRate.hits + hitRate.misses);
    });
  });

  describe('慢查询日志', () => {
    it('recordSlowLog 记录慢操作', () => {
      service.recordSlowLog('get', 'test:slow', 150);
      service.recordSlowLog('set', 'test:slow2', 200);
      const logs = service.getSlowLogs(10);
      expect(logs.length).toBe(2);
      expect(logs[0].operation).toBe('set');
      expect(logs[0].durationMs).toBe(200);
      expect(logs[1].operation).toBe('get');
    });

    it('getSlowLogs 遵守 limit', () => {
      service.recordSlowLog('get', 'k1', 10);
      service.recordSlowLog('get', 'k2', 20);
      service.recordSlowLog('get', 'k3', 30);
      const logs = service.getSlowLogs(2);
      expect(logs.length).toBe(2);
    });

    it('getSlowLogs 空日志返回空数组', () => {
      const logs = service.getSlowLogs(10);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('连接状态', () => {
    it('Redis 不可用时返回 fallback', () => {
      const state = service.getConnectionState();
      expect(state).toBe('fallback');
    });
  });

  describe('缓存预热', () => {
    it('warmup 后 isWarmed 返回 true', async () => {
      await service.warmup();
      const warmed = service.isWarmed();
      expect(warmed).toBe(true);
    });

    it('warmup 写入预热 key', async () => {
      await service.warmup();
      const health = await service.get<{ warmed: boolean }>('warmup:health');
      expect(health).not.toBeNull();
      if (health) {
        expect(health.warmed).toBe(true);
      }
    });
  });

  describe('降级到内存缓存', () => {
    it('Redis 不可用时 get/set 走内存缓存', async () => {
      const key = 'fallback:test';
      await service.set(key, { degraded: true });
      const result = await service.get<{ degraded: boolean }>(key);
      expect(result).toEqual({ degraded: true });
    });

    it('降级模式下 flush 正常工作', async () => {
      await service.set('fb:1', 'a');
      await service.set('fb:2', 'b');
      await service.flush();
      const r1 = await service.get('fb:1');
      expect(r1).toBeNull();
    });

    it('降级模式下 incr/decr 正常工作', async () => {
      const v = await service.incr('fb:counter');
      expect(v).toBeGreaterThan(0);
    });
  });

  describe('getKeysByPattern', () => {
    it('返回匹配模式的 key 列表', async () => {
      await service.set('keys:a', 1);
      await service.set('keys:b', 2);
      await service.set('others:c', 3);
      const result = await service.getKeysByPattern('keys:*');
      expect(result).toHaveLength(2);
      expect(result).toContain('keys:a');
      expect(result).toContain('keys:b');
    });
  });
});