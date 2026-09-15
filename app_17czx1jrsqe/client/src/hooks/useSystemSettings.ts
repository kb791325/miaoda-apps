import { useCallback, useEffect, useState } from 'react';
import { settingsApi } from '@/api';

export type SettingsMap = Record<string, string>;

interface UseSystemSettingsResult {
  settings: SettingsMap;
  reload: () => Promise<void>;
  loading: boolean;
}

export function useSystemSettings(group: string): UseSystemSettingsResult {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState<boolean>(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await settingsApi.getGroup(group);
      if (res && res.code === 0 && res.data) {
        setSettings(res.data as SettingsMap);
      } else {
        setSettings({});
      }
    } catch {
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, reload, loading };
}
