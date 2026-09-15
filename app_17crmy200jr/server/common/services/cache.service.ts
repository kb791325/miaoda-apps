import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expireAt: number;
}

@Injectable()
export class CacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize = 1000;

  set<T>(key: string, value: T, ttlMs: number = 60_000): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  deleteByPattern(pattern: string): number {
    let removed = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
