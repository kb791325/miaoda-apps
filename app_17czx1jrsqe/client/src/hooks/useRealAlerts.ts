import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { settingsApi } from '@/api';
import { portAccountsApi, contractsApi } from '@/api/entities';

export interface RealAlertItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const formatAmount = (value: number): string =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseDate = (value: string) => {
  if (/^\d+$/.test(value)) return dayjs(Number(value));
  return dayjs(value);
};

export function useRealAlerts() {
  const [alerts, setAlerts] = useState<RealAlertItem[]>([]);

  const refreshAlerts = useCallback(async () => {
    try {
      const settingRes = await settingsApi.getGroup('alert');
      const settings: Record<string, string> =
        settingRes.code === 0 && settingRes.data ? settingRes.data : {};
      const threshold = Number(settings.balance_threshold);
      const remindDays = Number(settings.contract_remind_days);
      const items: RealAlertItem[] = [];
      const today = dayjs().startOf('day');
      const todayLabel = today.format('YYYY-MM-DD');
      const jobs: Promise<void>[] = [];

      if (Number.isFinite(threshold)) {
        jobs.push(
          portAccountsApi
            .list({ page: 1, pageSize: 500 })
            .then((res) => {
              if (res.code !== 0) return;
              const list = (res.data && res.data.list) || [];
              list.forEach((acc) => {
                const balance = Number(acc.balance);
                if (Number.isFinite(balance) && balance < threshold) {
                  items.push({
                    id: `alert-port-${acc.id}`,
                    title: '余额预警',
                    content: `${acc.port_name || '未知端口'} 余额 ¥${formatAmount(balance)} 低于阈值 ¥${formatAmount(threshold)}`,
                    createdAt: todayLabel,
                  });
                }
              });
            })
            .catch((err: unknown) => {
              logger.warn('[useRealAlerts] fetch port accounts failed', { err: String(err) });
            }),
        );
      }

      if (Number.isFinite(remindDays) && remindDays >= 0) {
        jobs.push(
          contractsApi
            .list({ page: 1, pageSize: 500 })
            .then((res) => {
              if (res.code !== 0) return;
              const list = (res.data && res.data.list) || [];
              list.forEach((c) => {
                const end = parseDate(String(c.end_date || ''));
                if (!end.isValid()) return;
                const days = end.startOf('day').diff(today, 'day');
                if (days >= 0 && days <= remindDays) {
                  items.push({
                    id: `alert-contract-${c.id}`,
                    title: '合同到期预警',
                    content: `${c.name || '未命名合同'} 将于 ${end.format('YYYY-MM-DD')} 到期`,
                    createdAt: todayLabel,
                  });
                }
              });
            })
            .catch((err: unknown) => {
              logger.warn('[useRealAlerts] fetch contracts failed', { err: String(err) });
            }),
        );
      }

      await Promise.all(jobs);
      setAlerts(items);
    } catch (err) {
      logger.warn('[useRealAlerts] refresh alerts failed', { err: String(err) });
      setAlerts([]);
    }
  }, []);

  return { alerts, refreshAlerts };
}
