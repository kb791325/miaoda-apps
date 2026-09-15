import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import cacheConfig from './cache.config';
import { MemoryCacheService } from './memory-cache.service';

export type ConnectionState =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'fallback';

export interface SlowLogEntry {
  operation: string;
  key: string;
  durationMs: number;
  timestamp: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private redisUnavailable = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly ttl: number;
  private readonly slowLogThreshold: number;

  // 2.1 Connection state
  private connectionState: ConnectionState = 'disconnected';

  // 2.2 Slow query logs
  private slowLogs: SlowLogEntry[] = [];

  // 2.3 Hit rate stats
  private cacheHits = 0;
  private cacheMisses = 0;
  private perPrefixStats = new Map<
    string,
    { hits: number; misses: number }
  >();

  // 2.4 Cache warmup
  private warmupEntries: Array<{
    key: string;
    value: unknown;
    ttlMs?: number;
  }> = [];
  private warmed = false;

  constructor(
    @Inject(cacheConfig.KEY) private readonly config: ConfigType<typeof cacheConfig>,
    private readonly memoryCache: MemoryCacheService,
  ) {
    this.ttl = config.ttl * 1000;
    this.slowLogThreshold = config.slowLogThreshold;
    this.initRedis();
  }

  // ─── 2.1 Connection State ────────────────────────────────────

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // ─── 2.2 Slow Query Logging ──────────────────────────────────

  private recordSlowLog(
    operation: string,
    key: string,
    durationMs: number,
  ): void {
    this.slowLogs.push({
      operation,
      key,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
    if (this.slowLogs.length > 200) {
      this.slowLogs = this.slowLogs.slice(-200);
    }
  }

  getSlowLogs(limit?: number): SlowLogEntry[] {
    if (limit !== undefined && limit > 0) {
      return this.slowLogs.slice(-limit);
    }
    return [...this.slowLogs];
  }

  // ─── 2.3 Hit Rate Stats ──────────────────────────────────────

  private getPrefix(key: string): string {
    const idx = key.indexOf(':');
    return idx > 0 ? key.slice(0, idx) : '_global';
  }

  private recordHit(key: string): void {
    this.cacheHits += 1;
    const prefix = this.getPrefix(key);
    const stats = this.perPrefixStats.get(prefix);
    if (stats) {
      stats.hits += 1;
    } else {
      this.perPrefixStats.set(prefix, { hits: 1, misses: 0 });
    }
  }

  private recordMiss(key: string): void {
    this.cacheMisses += 1;
    const prefix = this.getPrefix(key);
    const stats = this.perPrefixStats.get(prefix);
    if (stats) {
      stats.misses += 1;
    } else {
      this.perPrefixStats.set(prefix, { hits: 0, misses: 1 });
    }
  }

  getHitRateStats(): {
    global: { hits: number; misses: number; hitRate: number };
    byPrefix: Array<{
      prefix: string;
      hits: number;
      misses: number;
      hitRate: number;
    }>;
  } {
    const total = this.cacheHits + this.cacheMisses;
    const globalHitRate = total > 0 ? this.cacheHits / total : 0;

    const byPrefix: Array<{
      prefix: string;
      hits: number;
      misses: number;
      hitRate: number;
    }> = [];
    for (const [prefix, stats] of Array.from(this.perPrefixStats)) {
      const prefixTotal = stats.hits + stats.misses;
      byPrefix.push({
        prefix,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: prefixTotal > 0 ? stats.hits / prefixTotal : 0,
      });
    }

    return {
      global: { hits: this.cacheHits, misses: this.cacheMisses, hitRate: globalHitRate },
      byPrefix,
    };
  }

  // ─── 2.4 Cache Warmup ────────────────────────────────────────

  registerWarmup(key: string, value: unknown, ttlMs?: number): void {
    this.warmupEntries.push({ key, value, ttlMs });
  }

  async warmup(): Promise<void> {
    if (this.warmed) {
      this.logger.log('缓存已预热，跳过重复预热');
      return;
    }
    if (this.warmupEntries.length === 0) {
      this.warmed = true;
      return;
    }
    this.logger.log(`开始缓存预热，共 ${this.warmupEntries.length} 条`);
    let success = 0;
    for (const entry of this.warmupEntries) {
      try {
        await this.set(entry.key, entry.value, entry.ttlMs);
        success += 1;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `缓存预热失败 [${entry.key}]: ${message}`,
        );
      }
    }
    this.warmed = true;
    this.logger.log(`缓存预热完成: ${success}/${this.warmupEntries.length}`);
  }

  isWarmed(): boolean {
    return this.warmed;
  }

  // ─── Redis 初始化 ────────────────────────────────────────────

  private initRedis(): void {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        maxLoadingRetryTime: this.config.maxLoadingRetryTime,
        enableReadyCheck: this.config.enableReadyCheck,
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        retryStrategy: this.config.retryStrategy,
        tls: this.config.tls as
          | Record<string, unknown>
          | undefined,
        sentinels: this.config.sentinels as
          | Array<{ host: string; port: number }>
          | undefined,
        name: this.config.name as string | undefined,
        lazyConnect: true,
      });

      this.redis.on('error', (err: Error) => {
        if (!this.redisUnavailable) {
          this.logger.warn(
            `Redis 连接失败，降级到内存缓存: ${err.message}`,
          );
          this.redisUnavailable = true;
          this.connectionState = 'fallback';
        }
      });

      this.redis.on('ready', () => {
        if (this.redisUnavailable) {
          this.logger.log('Redis 连接已恢复');
        }
        this.redisUnavailable = false;
        this.connectionState = 'connected';
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis 正在连接...');
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis 连接已关闭');
      });

      this.redis.connect().catch((err: Error) => {
        this.logger.warn(
          `Redis 初始连接失败，使用内存缓存: ${err.message}`,
        );
        this.redisUnavailable = true;
        this.connectionState = 'fallback';
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Redis 初始化失败，使用内存缓存: ${message}`,
      );
      this.redisUnavailable = true;
      this.connectionState = 'fallback';
    }
  }

  private getBackend(): Redis | MemoryCacheService {
    if (
      this.redisUnavailable ||
      !this.redis ||
      this.redis.status !== 'ready'
    ) {
      if (this.connectionState !== 'fallback') {
        this.connectionState = 'fallback';
      }
      return this.memoryCache;
    }
    return this.redis;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.connectionState = 'reconnecting';
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.redis && this.redis.status !== 'ready') {
        this.redis.connect().catch(() => {
          this.scheduleReconnect();
        });
      }
    }, 30_000);
  }

  // ─── Core Operations ─────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      const result = await backend.get<T>(key);
      if (result !== null) this.recordHit(key);
      else this.recordMiss(key);
      return result;
    }
    const start = Date.now();
    try {
      const raw = await backend.get(key);
      const duration = Date.now() - start;
      if (duration > this.slowLogThreshold) {
        this.recordSlowLog('get', key, duration);
      }
      if (raw === null) {
        this.recordMiss(key);
        return null;
      }
      this.recordHit(key);
      return JSON.parse(raw) as T;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      const result = await this.memoryCache.get<T>(key);
      if (result !== null) this.recordHit(key);
      else this.recordMiss(key);
      return result;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.ttl;
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      await backend.set(key, value, ttl);
      return;
    }
    const start = Date.now();
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await backend.set(key, serialized, 'PX', ttl);
      } else {
        await backend.set(key, serialized);
      }
      const duration = Date.now() - start;
      if (duration > this.slowLogThreshold) {
        this.recordSlowLog('set', key, duration);
      }
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      await this.memoryCache.set(key, value, ttl);
    }
  }

  async del(key: string): Promise<boolean> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.del(key);
    }
    const start = Date.now();
    try {
      const result = await backend.del(key);
      const duration = Date.now() - start;
      if (duration > this.slowLogThreshold) {
        this.recordSlowLog('del', key, duration);
      }
      return result > 0;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.del(key);
    }
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.deleteByPrefix(prefix);
    }
    try {
      const keys = await backend.keys(`${prefix}*`);
      if (keys.length === 0) return 0;
      return await backend.del(...keys);
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.deleteByPrefix(prefix);
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.deleteByPattern(pattern);
    }
    try {
      const keys = await backend.keys(pattern);
      if (keys.length === 0) return 0;
      return await backend.del(...keys);
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.deleteByPattern(pattern);
    }
  }

  async exists(key: string): Promise<boolean> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.exists(key);
    }
    try {
      const result = await backend.exists(key);
      return result === 1;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.exists(key);
    }
  }

  async expire(key: string, ttlMs: number): Promise<boolean> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.expire(key, ttlMs);
    }
    try {
      const result = await backend.pexpire(key, ttlMs);
      return result === 1;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.expire(key, ttlMs);
    }
  }

  async flush(): Promise<void> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      await backend.flush();
      return;
    }
    try {
      await backend.flushdb();
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      await this.memoryCache.flush();
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.getKeys(pattern);
    }
    try {
      return await backend.keys(pattern);
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.getKeys(pattern);
    }
  }

  async incr(key: string): Promise<number> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.incr(key);
    }
    try {
      return await backend.incr(key);
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.incr(key);
    }
  }

  async decr(key: string): Promise<number> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.decr(key);
    }
    try {
      return await backend.decr(key);
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.decr(key);
    }
  }

  // ─── 2.5 Batch Operations ────────────────────────────────────

  private async mgetFromMemory<T>(
    keys: string[],
  ): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    const entries = await Promise.all(
      keys.map(
        async (k: string) =>
          [k, await this.memoryCache.get<T>(k)] as const,
      ),
    );
    for (const [k, v] of entries) {
      result.set(k, v);
    }
    return result;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    if (keys.length === 0) return result;

    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return this.mgetFromMemory<T>(keys);
    }
    const start = Date.now();
    try {
      const pipeline = backend.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const rawResults = await pipeline.exec();
      const duration = Date.now() - start;
      if (duration > this.slowLogThreshold) {
        this.recordSlowLog('mget', `batch(${keys.length})`, duration);
      }
      if (rawResults) {
        for (let i = 0; i < keys.length; i++) {
          const raw = rawResults[i] as
            | [Error | null, string | null]
            | null;
          if (!raw) {
            result.set(keys[i], null);
            continue;
          }
          const [err, val] = raw;
          if (err) {
            result.set(keys[i], null);
          } else {
            result.set(
              keys[i],
              val ? (JSON.parse(val) as T) : null,
            );
          }
        }
      }
      return result;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.mgetFromMemory<T>(keys);
    }
  }

  async mset(
    entries: Array<{ key: string; value: unknown; ttlMs?: number }>,
  ): Promise<void> {
    if (entries.length === 0) return;

    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      await Promise.all(
        entries.map((e) =>
          this.memoryCache.set(e.key, e.value, e.ttlMs ?? this.ttl),
        ),
      );
      return;
    }
    const start = Date.now();
    try {
      const pipeline = backend.pipeline();
      for (const entry of entries) {
        const serialized = JSON.stringify(entry.value);
        const ttl = entry.ttlMs ?? this.ttl;
        if (ttl > 0) {
          pipeline.set(entry.key, serialized, 'PX', ttl);
        } else {
          pipeline.set(entry.key, serialized);
        }
      }
      await pipeline.exec();
      const duration = Date.now() - start;
      if (duration > this.slowLogThreshold) {
        this.recordSlowLog(
          'mset',
          `batch(${entries.length})`,
          duration,
        );
      }
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      await Promise.all(
        entries.map((e) =>
          this.memoryCache.set(e.key, e.value, e.ttlMs ?? this.ttl),
        ),
      );
    }
  }

  async mdel(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      let removed = 0;
      for (const key of keys) {
        if (await this.memoryCache.del(key)) removed += 1;
      }
      return removed;
    }
    const start = Date.now();
    try {
      const result = await backend.del(...keys);
      const duration = Date.now() - start;
      if (duration > this.slowLogThreshold) {
        this.recordSlowLog('mdel', `batch(${keys.length})`, duration);
      }
      return result;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      let removed = 0;
      for (const key of keys) {
        if (await this.memoryCache.del(key)) removed += 1;
      }
      return removed;
    }
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const backend = this.getBackend();
    if (backend instanceof MemoryCacheService) {
      return backend.getKeys(pattern);
    }
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await backend.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      return keys;
    } catch {
      this.redisUnavailable = true;
      this.scheduleReconnect();
      return this.memoryCache.getKeys(pattern);
    }
  }

  // ─── 2.6 Enhanced Stats ──────────────────────────────────────

  getStats(): {
    redisStatus: 'connected' | 'disconnected' | 'fallback';
    connectionState: ConnectionState;
    memory: {
      hits: number;
      misses: number;
      size: number;
      maxSize: number;
      usagePercent: number;
      hitRate: number;
    };
    hitRate: number;
    slowLogCount: number;
    warmed: boolean;
  } {
    const memStats = this.memoryCache.getStats();
    const hitRateStats = this.getHitRateStats();
    return {
      redisStatus: this.redisUnavailable ? 'fallback' : 'connected',
      connectionState: this.connectionState,
      memory: memStats,
      hitRate: hitRateStats.global.hitRate,
      slowLogCount: this.slowLogs.length,
      warmed: this.warmed,
    };
  }
}