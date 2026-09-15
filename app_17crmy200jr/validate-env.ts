#!/usr/bin/env node
/**
 * 环境变量配置验证脚本
 *
 * 用法:
 *   npx tsx validate-env.ts
 *
 * 功能:
 *   1. 检查必需环境变量是否存在
 *   2. 检查环境变量格式是否正确
 *   3. 检查敏感信息是否仍为默认值
 *   4. 输出彩色验证报告
 *   5. 存在错误时以非零退出码退出
 */

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
] as const;

const OPTIONAL_VARS = [
  'NODE_ENV',
  'PORT',
  'APP_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_TLS_ENABLED',
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
  'COOKIE_SECRET',
  'CORS_ORIGIN',
  'LOG_LEVEL',
  'LOG_FORMAT',
] as const;

const DANGEROUS_DEFAULTS = [
  'please-change',
  'xxxxxxxx',
  'changeme',
  'replaceme',
  'username',
  'password',
  'secret-key',
  'your-',
];

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function red(s: string): string {
  return `\x1b[31m${s}\x1b[0m`;
}
function green(s: string): string {
  return `\x1b[32m${s}\x1b[0m`;
}
function yellow(s: string): string {
  return `\x1b[33m${s}\x1b[0m`;
}
function cyan(s: string): string {
  return `\x1b[36m${s}\x1b[0m`;
}
function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}
function dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}

// ---------------------------------------------------------------------------
// 加载 .env 文件
// ---------------------------------------------------------------------------

function loadEnvFile(): void {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines: string[] = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// 验证逻辑
// ---------------------------------------------------------------------------

interface CheckResult {
  level: 'error' | 'warn' | 'pass';
  varName: string;
  message: string;
}

function isDangerousDefault(value: string): string | null {
  const lower = value.toLowerCase();
  for (const pattern of DANGEROUS_DEFAULTS) {
    if (lower.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

function validateFormat(varName: string, value: string): string | null {
  switch (varName) {
    case 'DATABASE_URL':
      if (
        !value.startsWith('postgresql://') &&
        !value.startsWith('postgres://')
      ) {
        return (
          `格式应为 postgresql:// 或 postgres:// 开头，` +
          `当前: ${value.slice(0, 30)}...`
        );
      }
      break;
    case 'PORT':
    case 'REDIS_PORT':
      if (value !== '' && Number.isNaN(Number(value))) {
        return `应为数字，当前: ${value}`;
      }
      break;
    case 'REDIS_TLS_ENABLED':
      if (value !== '' && value !== 'true' && value !== 'false') {
        return `应为布尔值 (true/false)，当前: ${value}`;
      }
      break;
    case 'CORS_ORIGIN':
      if (
        value !== '' &&
        !value.startsWith('http://') &&
        !value.startsWith('https://')
      ) {
        return `应为 http:// 或 https:// 开头的 URL，当前: ${value}`;
      }
      break;
    case 'NODE_ENV':
      if (
        value !== '' &&
        value !== 'development' &&
        value !== 'production' &&
        value !== 'test'
      ) {
        return `应为 development | production | test，当前: ${value}`;
      }
      break;
    case 'LOG_LEVEL':
      if (
        value !== '' &&
        value !== 'error' &&
        value !== 'warn' &&
        value !== 'info' &&
        value !== 'debug' &&
        value !== 'verbose'
      ) {
        return (
          `应为 error | warn | info | debug | verbose，` +
          `当前: ${value}`
        );
      }
      break;
    case 'LOG_FORMAT':
      if (value !== '' && value !== 'json' && value !== 'text') {
        return `应为 json | text，当前: ${value}`;
      }
      break;
    default:
      break;
  }
  return null;
}

function runChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. 检查必需变量
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      results.push({
        level: 'error',
        varName,
        message: '缺少必需的环境变量',
      });
      continue;
    }

    // 检查危险默认值
    const dangerous = isDangerousDefault(value);
    if (dangerous) {
      results.push({
        level: 'error',
        varName,
        message: `使用了敏感占位符 "${dangerous}"，请替换为真实值`,
      });
      continue;
    }

    // 格式校验
    const formatErr = validateFormat(varName, value);
    if (formatErr) {
      results.push({
        level: 'error',
        varName,
        message: formatErr,
      });
      continue;
    }

    results.push({
      level: 'pass',
      varName,
      message: '已配置',
    });
  }

  // 2. 检查可选变量
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      results.push({
        level: 'warn',
        varName,
        message: '未设置（可选）',
      });
      continue;
    }

    // 检查危险默认值
    const dangerous = isDangerousDefault(value);
    if (dangerous) {
      results.push({
        level: 'warn',
        varName,
        message: `使用了占位符 "${dangerous}"，建议替换`,
      });
      continue;
    }

    // 格式校验
    const formatErr = validateFormat(varName, value);
    if (formatErr) {
      results.push({
        level: 'warn',
        varName,
        message: formatErr,
      });
      continue;
    }

    results.push({
      level: 'pass',
      varName,
      message: '已配置',
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// 报告输出
// ---------------------------------------------------------------------------

function printReport(results: CheckResult[]): void {
  const errors = results.filter((r: CheckResult) => r.level === 'error');
  const warns = results.filter((r: CheckResult) => r.level === 'warn');
  const passes = results.filter((r: CheckResult) => r.level === 'pass');

  process.stdout.write('\n');
  process.stdout.write(bold('══════════════════════════════════════════\n'));
  process.stdout.write(bold('       环境变量配置验证报告\n'));
  process.stdout.write(bold('══════════════════════════════════════════\n'));
  process.stdout.write('\n');

  // 按级别分组输出
  if (errors.length > 0) {
    process.stdout.write(red('❌ 错误:\n'));
    for (const r of errors) {
      process.stdout.write(
        `   ${red('✗')} ${cyan(r.varName)} — ${r.message}\n`,
      );
    }
    process.stdout.write('\n');
  }

  if (warns.length > 0) {
    process.stdout.write(yellow('⚠️  警告:\n'));
    for (const r of warns) {
      process.stdout.write(
        `   ${yellow('!')} ${cyan(r.varName)} — ${r.message}\n`,
      );
    }
    process.stdout.write('\n');
  }

  if (passes.length > 0) {
    process.stdout.write(green('✅ 通过:\n'));
    for (const r of passes) {
      process.stdout.write(
        `   ${green('✓')} ${dim(r.varName)} — ${r.message}\n`,
      );
    }
    process.stdout.write('\n');
  }

  // 汇总
  process.stdout.write(
    bold('──────────────────────────────────────────\n'),
  );
  process.stdout.write(
    `   ${green(`✅ 通过: ${passes.length} 项`)}  |  ` +
      `${yellow(`⚠️ 警告: ${warns.length} 项`)}  |  ` +
      `${red(`❌ 错误: ${errors.length} 项`)}\n`,
  );
  process.stdout.write(
    bold('══════════════════════════════════════════\n'),
  );
  process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

function main(): void {
  loadEnvFile();

  const results = runChecks();
  printReport(results);

  const hasErrors = results.some(
    (r: CheckResult) => r.level === 'error',
  );
  if (hasErrors) {
    process.stdout.write(
      red('验证失败：存在错误项，请修复后重新运行。\n\n'),
    );
    process.exit(1);
  } else {
    process.stdout.write(
      green('验证通过：所有必需变量已正确配置。\n\n'),
    );
    process.exit(0);
  }
}

main();