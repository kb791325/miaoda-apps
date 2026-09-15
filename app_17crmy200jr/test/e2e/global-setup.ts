import { FullConfig } from '@playwright/test';
import { setupTestDatabase, seedTestData } from './setup/setup-test-db';

async function globalSetup(config: FullConfig): Promise<void> {
  // 等待 webServer 启动后获取 baseURL
  const baseURL: string =
    (config.projects[0]?.use?.baseURL as string) || 'http://localhost:3000';

  // 初始化测试数据库（no-op，FaaS 环境已就绪）
  await setupTestDatabase(baseURL);

  // 插入测试数据
  await seedTestData(baseURL);

  console.log('[Global Setup] Test environment ready');
}

export default globalSetup;