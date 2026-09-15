import { registerAs } from '@nestjs/config';

const isProduction = process.env.NODE_ENV === 'production';

export default registerAs('cache', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  maxRetriesPerRequest: isProduction ? 3 : 1,
  maxLoadingRetryTime: 10000,
  retryStrategy: (times: number): number | null => {
    if (times > 10) return null;
    return Math.min(times * 200, 3000);
  },
  connectTimeout: isProduction ? 10000 : 5000,
  commandTimeout: isProduction ? 5000 : 3000,
  enableReadyCheck: true,
  maxKeys: 10000,
  fallbackToMemory: process.env.REDIS_FALLBACK_TO_MEMORY !== 'false',
  memoryCacheMaxSize: 1000,
  enableMetrics: true,
  slowLogThreshold: 100,
  tls:
    isProduction && process.env.REDIS_TLS_ENABLED === 'true'
      ? {}
      : undefined,
  sentinels: process.env.REDIS_SENTINEL_HOSTS
    ? process.env.REDIS_SENTINEL_HOSTS.split(',').map(
        (s: string): { host: string; port: number } => {
          const [host, port] = s.trim().split(':');
          return { host, port: parseInt(port || '26379', 10) };
        },
      )
    : undefined,
  name: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
}));