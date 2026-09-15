import { FullConfig } from '@playwright/test';
import { teardownTestDatabase } from './setup/setup-test-db';

async function globalTeardown(config: FullConfig): Promise<void> {
  const baseURL: string =
    (config.projects[0]?.use?.baseURL as string) || 'http://localhost:3000';

  // 清理测试数据
  await teardownTestDatabase(baseURL);

  console.log('[Global Teardown] Test environment cleaned up');
}

export default globalTeardown;