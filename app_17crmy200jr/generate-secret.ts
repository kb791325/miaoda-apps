#!/usr/bin/env node
/**
 * 安全密钥生成工具
 *
 * 用法:
 *   npx tsx generate-secret.ts                    # 默认 64 字节 hex
 *   npx tsx generate-secret.ts --length=32        # 32 字节
 *   npx tsx generate-secret.ts -l 32 -f base64    # 32 字节 base64
 *   npx tsx generate-secret.ts --json             # JSON 格式多密钥
 *   npx tsx generate-secret.ts --help             # 帮助
 */

import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

interface ParsedArgs {
  length: number;
  format: 'hex' | 'base64';
  json: boolean;
  help: boolean;
}

// ---------------------------------------------------------------------------
// 命令行参数解析
// ---------------------------------------------------------------------------

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    length: 64,
    format: 'hex',
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return result;
    }

    if (arg === '--json') {
      result.json = true;
      continue;
    }

    // --length=64 或 --length 64
    const lenMatch = arg.match(/^--length=(.+)$/);
    if (lenMatch) {
      result.length = parseInt(lenMatch[1], 10);
      continue;
    }
    if (arg === '--length' || arg === '-l') {
      const next = args[++i];
      if (next) {
        result.length = parseInt(next, 10);
      }
      continue;
    }

    // --format=hex|base64 或 --format hex|base64
    const fmtMatch = arg.match(/^--format=(.+)$/);
    if (fmtMatch) {
      const fmt = fmtMatch[1];
      if (fmt === 'hex' || fmt === 'base64') {
        result.format = fmt;
      }
      continue;
    }
    if (arg === '--format' || arg === '-f') {
      const next = args[++i];
      if (next === 'hex' || next === 'base64') {
        result.format = next;
      }
      continue;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 帮助信息
// ---------------------------------------------------------------------------

function printHelp(): void {
  const green = (s: string): string => `\x1b[32m${s}\x1b[0m`;
  const cyan = (s: string): string => `\x1b[36m${s}\x1b[0m`;
  const bold = (s: string): string => `\x1b[1m${s}\x1b[0m`;
  const dim = (s: string): string => `\x1b[2m${s}\x1b[0m`;

  process.stdout.write('\n');
  process.stdout.write(bold('安全密钥生成工具\n'));
  process.stdout.write(
    dim('使用 crypto.randomBytes 生成密码学安全的随机密钥\n'),
  );
  process.stdout.write('\n');
  process.stdout.write(bold('用法:\n'));
  process.stdout.write(
    `  ${green('npx tsx generate-secret.ts')} ${dim('[选项]')}\n`,
  );
  process.stdout.write('\n');
  process.stdout.write(bold('选项:\n'));
  process.stdout.write(
    `  ${cyan('-l, --length <N>')}  密钥长度（字节），默认 ${dim('64')}\n`,
  );
  process.stdout.write(
    `  ${cyan('-f, --format <F>')}  输出格式: ${dim('hex')} | ${dim('base64')}，默认 ${dim('hex')}\n`,
  );
  process.stdout.write(
    `  ${cyan('--json')}           输出 JSON 格式（含多组密钥）\n`,
  );
  process.stdout.write(
    `  ${cyan('-h, --help')}       显示帮助信息\n`,
  );
  process.stdout.write('\n');
  process.stdout.write(bold('示例:\n'));
  process.stdout.write(`  ${dim('# 生成 64 字节 hex 密钥')}\n`);
  process.stdout.write(
    `  ${green('npx tsx generate-secret.ts')}\n\n`,
  );
  process.stdout.write(`  ${dim('# 生成 32 字节 base64 密钥')}\n`);
  process.stdout.write(
    `  ${green('npx tsx generate-secret.ts -l 32 -f base64')}\n\n`,
  );
  process.stdout.write(
    `  ${dim('# 生成 .env 可用的 JSON 配置')}\n`,
  );
  process.stdout.write(
    `  ${green('npx tsx generate-secret.ts --json')}\n\n`,
  );
  process.stdout.write(
    `  ${dim('# 生成后复制到 .env 文件')}\n`,
  );
  process.stdout.write(
    `  ${green('npx tsx generate-secret.ts --json')} ${dim('>> .env')}\n\n`,
  );
}

// ---------------------------------------------------------------------------
// 密钥生成
// ---------------------------------------------------------------------------

function generateSecret(
  length: number,
  format: 'hex' | 'base64',
): string {
  return randomBytes(length).toString(format);
}

// ---------------------------------------------------------------------------
// 单密钥输出
// ---------------------------------------------------------------------------

function printSingle(
  length: number,
  format: 'hex' | 'base64',
): void {
  const secret = generateSecret(length, format);
  process.stdout.write(`${secret}\n`);
}

// ---------------------------------------------------------------------------
// JSON 多密钥输出
// ---------------------------------------------------------------------------

function printJson(): void {
  const secrets = {
    jwtSecret: generateSecret(64, 'hex'),
    sessionSecret: generateSecret(64, 'hex'),
    cookieSecret: generateSecret(64, 'hex'),
    refreshSecret: generateSecret(64, 'hex'),
  };

  process.stdout.write(`${JSON.stringify(secrets, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

function main(): void {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (
    Number.isNaN(opts.length) ||
    opts.length < 1 ||
    opts.length > 1024
  ) {
    process.stderr.write(
      `\x1b[31m错误: 长度必须为 1-1024 之间的整数，当前: ${opts.length}\x1b[0m\n\n`,
    );
    process.exit(1);
  }

  if (opts.json) {
    printJson();
  } else {
    printSingle(opts.length, opts.format);
  }
}

main();