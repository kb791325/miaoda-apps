import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from '../e2e/helpers/auth';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/** 性能指标采集结果 */
interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  domContentLoaded: number;
  loadComplete: number;
  dnsTime: number;
  tcpTime: number;
  ttfb: number;
  downloadTime: number;
}

/**
 * 等待页面加载并采集 Performance API 指标
 */
async function collectPerformanceMetrics(
  page: Page,
  url: string,
): Promise<PerformanceMetrics> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(
      (e: PerformanceEntry) => e.name === 'first-contentful-paint',
    );

    // LCP 通过 PerformanceObserver 的 buffered 查询获取
    // 注意：CLS/TBT 需要更长交互窗口，此处为基线采集
    const lcpEntries = performance.getEntriesByType(
      'largest-contentful-paint',
    );
    const lcpEntry = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1] : null;

    return {
      fcp: fcpEntry?.startTime ?? 0,
      lcp: lcpEntry?.startTime ?? 0,
      tbt: 0, // TBT 需要 Long Task API，仅在 Chrome 中可用
      cls: 0, // CLS 需要 LayoutShift API，此处为基线
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
      dnsTime: nav.domainLookupEnd - nav.domainLookupStart,
      tcpTime: nav.connectEnd - nav.connectStart,
      ttfb: nav.responseStart - nav.requestStart,
      downloadTime: nav.responseEnd - nav.responseStart,
    };
  });

  return metrics;
}

/**
 * 采集 Web Vitals（LCP / CLS / TBT）通过 web-vitals 风格的方式
 * 注意：此方法仅在 Chromium 中完整支持
 */
async function collectWebVitals(
  page: Page,
  url: string,
): Promise<{
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
}> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const vitals = await page.evaluate(() => {
    return new Promise<{
      fcp: number;
      lcp: number;
      cls: number;
      tbt: number;
    }>((resolve) => {
      const result = { fcp: 0, lcp: 0, cls: 0, tbt: 0 };

      // LCP observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          result.lcp = entries[entries.length - 1].startTime;
        }
      });
      try {
        lcpObserver.observe({
          type: 'largest-contentful-paint',
          buffered: true,
        });
      } catch {
        // 浏览器不支持
      }

      // CLS observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          const layoutShift = entry as unknown as {
            value: number;
            hadRecentInput: boolean;
          };
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        result.cls = clsValue;
      });
      try {
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // 浏览器不支持
      }

      // Long Task observer (TBT 近似)
      let tbtValue = 0;
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          tbtValue += entry.duration - 50; // 超过 50ms 的部分
        }
        result.tbt = tbtValue;
      });
      try {
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch {
        // 浏览器不支持
      }

      // FCP from paint entries
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(
        (e: PerformanceEntry) => e.name === 'first-contentful-paint',
      );
      if (fcpEntry) {
        result.fcp = fcpEntry.startTime;
      }

      // 等待 2 秒让 observer 收集数据
      setTimeout(() => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
        longTaskObserver.disconnect();
        resolve(result);
      }, 2000);
    });
  });

  return vitals;
}

// 测试页面列表
const PAGES_TO_TEST = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Expenses', path: '/expenses' },
  { name: 'Fixed Assets', path: '/fixed-assets' },
  { name: 'Inventory Dashboard', path: '/inventory-dashboard' },
  { name: 'Budget', path: '/budget' },
  { name: 'Monitoring', path: '/monitoring' },
] as const;

test.describe('Frontend Performance', () => {
  // 每个测试前登录
  test.beforeEach(async ({ page }: { page: Page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Page Load Performance (Navigation Timing)', () => {
    for (const { name, path } of PAGES_TO_TEST) {
      test(`${name} page (${path}) — load metrics`, async ({
        page,
      }: {
        page: Page;
      }) => {
        const metrics = await collectPerformanceMetrics(
          page,
          `${BASE_URL}${path}`,
        );

        // 断言：FCP < 2s
        expect(metrics.fcp).toBeLessThan(2000);
        // 断言：DOM 内容加载 < 3s
        expect(metrics.domContentLoaded).toBeLessThan(3000);
        // 断言：完全加载 < 5s
        expect(metrics.loadComplete).toBeLessThan(5000);
        // 断言：TTFB < 1.5s
        expect(metrics.ttfb).toBeLessThan(1500);

        console.log(
          `[${name}] FCP=${metrics.fcp.toFixed(0)}ms ` +
            `DOMLoaded=${metrics.domContentLoaded.toFixed(0)}ms ` +
            `Load=${metrics.loadComplete.toFixed(0)}ms ` +
            `TTFB=${metrics.ttfb.toFixed(0)}ms`,
        );
      });
    }
  });

  test.describe('Web Vitals (Chromium only)', () => {
    for (const { name, path } of PAGES_TO_TEST) {
      test(`${name} page (${path}) — web vitals`, async ({
        page,
        browserName,
      }: {
        page: Page;
        browserName: string;
      }) => {
        // Web Vitals 仅在 Chromium 中完整支持，跳过其他浏览器
        test.skip(
          browserName !== 'chromium',
          'Web Vitals only fully supported in Chromium',
        );

        const vitals = await collectWebVitals(page, `${BASE_URL}${path}`);

        // 断言：FCP < 2s
        expect(vitals.fcp).toBeLessThan(2000);
        // 断言：LCP < 2.5s
        expect(vitals.lcp).toBeLessThan(2500);
        // 断言：CLS < 0.1
        expect(vitals.cls).toBeLessThan(0.1);
        // 断言：TBT < 300ms（仅在 Long Task API 可用时）
        if (vitals.tbt > 0) {
          expect(vitals.tbt).toBeLessThan(300);
        }

        console.log(
          `[${name}] Vitals: FCP=${vitals.fcp.toFixed(0)}ms ` +
            `LCP=${vitals.lcp.toFixed(0)}ms ` +
            `CLS=${vitals.cls.toFixed(4)} ` +
            `TBT=${vitals.tbt.toFixed(0)}ms`,
        );
      });
    }
  });

  test.describe('Resource Timing', () => {
    test('Dashboard — no broken resources', async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

      const brokenResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const broken: string[] = [];
        for (const entry of resources) {
          const res = entry as PerformanceResourceTiming;
          // transferSize=0 且非缓存命中（encodedBodySize=0, decodedBodySize=0）
          // 可能表示请求失败
          if (
            res.transferSize === 0 &&
            res.decodedBodySize === 0 &&
            res.encodedBodySize === 0 &&
            !res.name.includes('data:') &&
            !res.name.includes('blob:')
          ) {
            broken.push(res.name);
          }
        }
        return broken;
      });

      // 允许少量非关键资源 404（如 favicon），但不应超过 5 个
      expect(brokenResources.length).toBeLessThan(5);
      if (brokenResources.length > 0) {
        console.warn(
          `[Dashboard] Potentially broken resources: ${brokenResources.join(', ')}`,
        );
      }
    });
  });

  test.describe('Memory Usage', () => {
    test('Dashboard — memory after navigation', async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

      const memInfo = await page.evaluate(() => {
        const mem = (performance as unknown as { memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        } }).memory;

        if (!mem) return null;
        return {
          usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1024 / 1024),
          totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024),
          jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
        };
      });

      if (memInfo) {
        console.log(
          `[Dashboard] JS Heap: ${memInfo.usedJSHeapSize}MB / ${memInfo.totalJSHeapSize}MB (limit: ${memInfo.jsHeapSizeLimit}MB)`,
        );
        // 断言：使用内存不超过 200MB
        expect(memInfo.usedJSHeapSize).toBeLessThan(200);
      }
    });
  });
});