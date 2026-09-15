import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface CredentialOptions {
  required: boolean;
  rotationIntervalDays: number;
  description: string;
  format: 'text' | 'url' | 'number' | 'boolean';
}

interface CredentialEntry {
  value: string;
  lastRotated: Date;
  rotationIntervalDays: number;
  description: string;
  format: string;
  required: boolean;
}

interface CredentialMetadata {
  key: string;
  description: string;
  lastRotated: Date;
  rotationIntervalDays: number;
  isExpired: boolean;
  valuePreview: string;
}

interface AccessLogEntry {
  timestamp: Date;
  key: string;
  caller: string;
}

interface ExpiryWarning {
  key: string;
  daysUntilExpiry: number;
  severity: 'warning' | 'critical';
}

const DEFAULT_CREDENTIAL_CONFIGS: Record<
  string,
  Partial<CredentialOptions>
> = {
  DATABASE_URL: {
    rotationIntervalDays: 90,
    required: true,
    description: '数据库连接 URL',
    format: 'url',
  },
  JWT_SECRET: {
    rotationIntervalDays: 60,
    required: true,
    description: 'JWT 签名密钥',
    format: 'text',
  },
  JWT_REFRESH_SECRET: {
    rotationIntervalDays: 60,
    required: true,
    description: 'JWT 刷新令牌密钥',
    format: 'text',
  },
  SESSION_SECRET: {
    rotationIntervalDays: 30,
    required: true,
    description: '会话密钥',
    format: 'text',
  },
  COOKIE_SECRET: {
    rotationIntervalDays: 30,
    required: true,
    description: 'Cookie 签名密钥',
    format: 'text',
  },
  FEISHU_APP_SECRET: {
    rotationIntervalDays: 90,
    required: true,
    description: '飞书应用密钥',
    format: 'text',
  },
  REDIS_PASSWORD: {
    rotationIntervalDays: 90,
    required: false,
    description: 'Redis 连接密码',
    format: 'text',
  },
};

@Injectable()
export class CredentialManagerService implements OnModuleInit {
  private readonly logger = new Logger(CredentialManagerService.name);
  private credentials: Map<string, CredentialEntry> = new Map();
  private accessLog: AccessLogEntry[] = [];
  private readonly maxAccessLogSize = 1000;

  onModuleInit(): void {
    this.logger.log('开始初始化凭据管理服务...');
    const keys: string[] = Object.keys(DEFAULT_CREDENTIAL_CONFIGS);
    let loadedCount = 0;
    let missingCount = 0;

    for (const key of keys) {
      const options: Partial<CredentialOptions> =
        DEFAULT_CREDENTIAL_CONFIGS[key];
      this.loadCredential(key, options);
      if (this.credentials.has(key)) {
        loadedCount += 1;
      } else if (options.required !== false) {
        missingCount += 1;
      }
    }

    this.logger.log(
      `凭据初始化完成: 已加载 ${loadedCount} 个凭据` +
        (missingCount > 0
          ? `, ${missingCount} 个必填凭据缺失`
          : ''),
    );

    if (missingCount > 0) {
      this.logger.warn(
        `存在 ${missingCount} 个必填凭据未配置，部分功能可能不可用`,
      );
    }
  }

  get(key: string): string | undefined {
    const entry: CredentialEntry | undefined = this.credentials.get(key);
    if (!entry) {
      return undefined;
    }
    this.logAccess(key, 'get');
    return entry.value;
  }

  getSecure(key: string): string | undefined {
    const entry: CredentialEntry | undefined = this.credentials.get(key);
    return entry ? entry.value : undefined;
  }

  getMetadata(key: string): CredentialMetadata | undefined {
    const entry: CredentialEntry | undefined = this.credentials.get(key);
    if (!entry) {
      return undefined;
    }
    const now: Date = new Date();
    const expiryDate: Date = new Date(
      entry.lastRotated.getTime() +
        entry.rotationIntervalDays * 24 * 60 * 60 * 1000,
    );

    return {
      key,
      description: entry.description,
      lastRotated: entry.lastRotated,
      rotationIntervalDays: entry.rotationIntervalDays,
      isExpired: now >= expiryDate,
      valuePreview: this.sanitizeValue(entry.value),
    };
  }

  listKeys(): string[] {
    return Array.from(this.credentials.keys());
  }

  checkExpiry(): ExpiryWarning[] {
    const now: Date = new Date();
    const warnings: ExpiryWarning[] = [];

    for (const [key, entry] of this.credentials) {
      const expiryDate: Date = new Date(
        entry.lastRotated.getTime() +
          entry.rotationIntervalDays * 24 * 60 * 60 * 1000,
      );
      const daysUntilExpiry: number = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysUntilExpiry <= 0) {
        warnings.push({
          key,
          daysUntilExpiry,
          severity: 'critical',
        });
      } else if (daysUntilExpiry <= 7) {
        warnings.push({
          key,
          daysUntilExpiry,
          severity: 'warning',
        });
      }
    }

    return warnings;
  }

  getAccessLogs(limit: number = 100): AccessLogEntry[] {
    const clampedLimit: number = Math.max(0, limit);
    return this.accessLog.slice(-clampedLimit);
  }

  hotReload(key: string, value: string): void {
    const existingEntry: CredentialEntry | undefined =
      this.credentials.get(key);
    if (!existingEntry) {
      this.logger.warn(
        `热更新失败: 凭据 "${key}" 未在托管列表中`,
      );
      return;
    }

    process.env[key] = value;
    existingEntry.value = value;
    this.credentials.set(key, existingEntry);
    this.logger.log(`凭据 "${key}" 已通过热更新刷新`);
  }

  markRotated(key: string): void {
    const entry: CredentialEntry | undefined = this.credentials.get(key);
    if (!entry) {
      this.logger.warn(
        `标记轮换失败: 凭据 "${key}" 未在托管列表中`,
      );
      return;
    }

    entry.lastRotated = new Date();
    this.credentials.set(key, entry);
    this.logger.log(`凭据 "${key}" 已标记为已轮换`);
  }

  private loadCredential(
    key: string,
    options?: Partial<CredentialOptions>,
  ): void {
    const envValue: string | undefined = process.env[key];

    if (envValue === undefined || envValue === '') {
      if (options?.required !== false) {
        this.logger.warn(
          `凭据 "${key}" 未在环境变量中配置` +
            (options?.description
              ? ` (${options.description})`
              : ''),
        );
      }
      return;
    }

    const entry: CredentialEntry = {
      value: envValue,
      lastRotated: new Date(),
      rotationIntervalDays: options?.rotationIntervalDays ?? 90,
      description: options?.description ?? key,
      format: options?.format ?? 'text',
      required: options?.required !== false,
    };

    this.credentials.set(key, entry);
    this.logger.log(
      `凭据 "${key}" 已加载` +
        (options?.description
          ? ` (${options.description})`
          : ''),
    );
  }

  private logAccess(key: string, caller: string): void {
    const entry: AccessLogEntry = {
      timestamp: new Date(),
      key,
      caller,
    };

    this.accessLog.push(entry);

    if (this.accessLog.length > this.maxAccessLogSize) {
      this.accessLog = this.accessLog.slice(
        this.accessLog.length - this.maxAccessLogSize,
      );
    }
  }

  private sanitizeValue(value: string): string {
    if (value.length <= 6) {
      return value.charAt(0) + '***' + value.charAt(value.length - 1);
    }
    const prefix: string = value.slice(0, 3);
    const suffix: string = value.slice(-3);
    return prefix + '***' + suffix;
  }
}