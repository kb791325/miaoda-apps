import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expireAt: number;
}

@Injectable()
export class MemoryCacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  private hits = 0;
  private misses = 0;

  constructor() {
    this.maxSize = parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '5000', 10);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      this.misses += 1;
      return null;
    }
    // LRU: move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60_000): Promise<void> {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, expireAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.get(key).then((v) => v !== null);
  }

  async expire(key: string, ttlMs: number): Promise<boolean> {
    const entry = this.cache.get(key) as CacheEntry<unknown> | undefined;
    if (!entry) return false;
    entry.expireAt = Date.now() + ttlMs;
    return true;
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  async getKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const glob = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${glob}$`);
    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  async incr(key: string): Promise<number> {
    const val = await this.get<number>(key);
    const next = (val ?? 0) + 1;
    await this.set(key, next, 0);
    return next;
  }

  async decr(key: string): Promise<number> {
    const val = await this.get<number>(key);
    const next = (val ?? 0) - 1;
    await this.set(key, next, 0);
    return next;
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let removed = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const keys = await this.getKeys(pattern);
    for (const key of keys) {
      this.cache.delete(key);
    }
    return keys.length;
  }

  getStats(): {
    hits: number;
    misses: number;
    size: number;
    maxSize: number;
    usagePercent: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      usagePercent: this.maxSize > 0 ? this.cache.size / this.maxSize : 0,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  getMemoryUsage(): { size: number; maxSize: number; usagePercent: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usagePercent: this.maxSize > 0 ? this.cache.size / this.maxSize : 0,
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }
}