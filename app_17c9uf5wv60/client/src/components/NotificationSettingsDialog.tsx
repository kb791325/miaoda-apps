import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Switch } from '@client/src/components/ui/switch';
import { Button } from '@client/src/components/ui/button';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getSettings, updateSettings } from '@client/src/api/notifications';
import type {
  NotificationSettings,
  UpdateNotificationSettingsRequest,
} from '@shared/api.interface';

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SettingItem {
  key: keyof UpdateNotificationSettingsRequest;
  label: string;
  description: string;
}

const settingItems: SettingItem[] = [
  {
    key: 'lowStockEnabled',
    label: '低库存预警',
    description: '当商品库存低于安全库存时发送通知',
  },
  {
    key: 'anomalyEnabled',
    label: '异常库存通知',
    description: '当检测到库存异常（如盘亏、过期）时发送通知',
  },
  {
    key: 'operationEnabled',
    label: '操作通知',
    description: '入库、出库、调拨等操作相关通知',
  },
  {
    key: 'systemEnabled',
    label: '系统公告',
    description: '系统维护、版本更新等公告类通知',
  },
];

const NotificationSettingsDialog = ({
  open,
  onOpenChange,
}: NotificationSettingsDialogProps) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getSettings()
        .then((data: NotificationSettings) => {
          setSettings(data);
        })
        .catch((err: Error) => {
          logger.error('[notifications] getSettings error', err.message);
          toast.error('获取通知设置失败');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open]);

  const handleToggle = (
    key: keyof UpdateNotificationSettingsRequest,
    checked: boolean,
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: checked });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data: UpdateNotificationSettingsRequest = {
        lowStockEnabled: settings.lowStockEnabled,
        anomalyEnabled: settings.anomalyEnabled,
        operationEnabled: settings.operationEnabled,
        systemEnabled: settings.systemEnabled,
      };
      await updateSettings(data);
      toast.success('通知设置已保存');
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error(
        '[notifications] updateSettings error',
        err instanceof Error ? err.message : String(err),
      );
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle>通知设置</DialogTitle>
          <DialogDescription>
            自定义你希望接收的通知类型
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading
            ? settingItems.map((item: SettingItem) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="h-4 w-24 rounded-sm bg-accent animate-pulse" />
                    <div className="h-3 w-48 rounded-sm bg-accent animate-pulse" />
                  </div>
                  <div className="h-5 w-9 rounded-full bg-accent animate-pulse" />
                </div>
              ))
            : settingItems.map((item: SettingItem) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    checked={settings?.[item.key] ?? false}
                    onCheckedChange={(checked: boolean) =>
                      handleToggle(item.key, checked)
                    }
                  />
                </div>
              ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="rounded-sm"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettingsDialog;
