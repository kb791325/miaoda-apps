import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
}

interface MetricReport {
  page: string;
  metrics: PerformanceMetrics;
  timestamp: string;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface EventTimingEntry extends PerformanceEntry {
  interactionId: number;
  duration: number;
}

let clsValue = 0;
let inpValue = 0;
const metrics: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  cls: null,
  inp: null,
  ttfb: null,
};

function getPageName(): string {
  return window.location.pathname;
}

function reportToBackend(report: MetricReport): void {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/performance/frontend',
      JSON.stringify(report),
    );
  } else {
    axiosForBackend({
      url: '/api/performance/frontend',
      method: 'POST',
      data: report,
    }).catch(() => {});
  }
}

function reportMetrics(): void {
  const allNull = Object.values(metrics).every((v) => v === null);
  if (allNull) return;

  const report: MetricReport = {
    page: getPageName(),
    metrics: { ...metrics },
    timestamp: new Date().toISOString(),
  };
  reportToBackend(report);
  logger.info('性能指标上报', report);
}

export function initPerformanceMonitoring(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    new PerformanceObserver((list: PerformanceObserverEntryList) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          metrics.fcp = Math.round(entry.startTime);
        }
      }
    }).observe({ type: 'paint', buffered: true });

    new PerformanceObserver((list: PerformanceObserverEntryList) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metrics.lcp = Math.round(lastEntry.startTime);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list: PerformanceObserverEntryList) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as LayoutShiftEntry;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      metrics.cls = Math.round(clsValue * 1000) / 1000;
    }).observe({ type: 'layout-shift', buffered: true });

    new PerformanceObserver((list: PerformanceObserverEntryList) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const eventEntry = entry as EventTimingEntry;
        if (eventEntry.interactionId) {
          inpValue = Math.max(inpValue, eventEntry.duration);
        }
      }
      metrics.inp = Math.round(inpValue);
    }).observe({ type: 'event', buffered: true } as PerformanceObserverInit);

    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      metrics.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
    }

    window.addEventListener('beforeunload', () => {
      reportMetrics();
    });

    window.addEventListener('pagehide', () => {
      reportMetrics();
    });

    setTimeout(() => {
      reportMetrics();
    }, 10000);
  } catch (err) {
    logger.error('性能监控初始化失败', err);
  }
}

export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}