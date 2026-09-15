import { useEffect, useState, type FC } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  REMINDER_PLACEHOLDER_OPTIONS,
  renderReminderMessage,
  type ReminderPlaceholderOption,
} from '@shared/reminder';
import {
  fetchReminderSetting,
  saveReminderSetting,
} from '@/api/reminder';
import { extractErrorMessage } from './customer-utils';

interface ReminderSettingDialogProps {
  open: boolean;
  onClose: () => void;
}

const SETTING_PREVIEW_CTX = {
  customerName: '李娜',
  salesName: '张浩然',
  nextFollowDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
  salesStage: '谈判中',
};

const ReminderSettingDialog: FC<ReminderSettingDialogProps> = ({
  open,
  onClose,
}) => {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchReminderSetting()
      .then((res: { template: string }) => {
        if (!cancelled) setTemplate(res.template);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleInsert = (placeholder: string): void => {
    setTemplate((prev: string) => prev + placeholder);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await saveReminderSetting({ template });
      toast.success('提醒模板已保存，新的提醒将按该模板生成');
      onClose();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const preview: string = template.trim()
    ? renderReminderMessage(template, SETTING_PREVIEW_CTX)
    : '';

  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>提醒设置</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            正在加载模板...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-base font-semibold">提醒消息模板</div>
              <Textarea
                rows={6}
                value={template}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setTemplate(e.target.value)
                }
                placeholder="输入提醒消息模板"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                可用占位符（点击插入到模板末尾）：
              </div>
              <div className="flex flex-wrap gap-2">
                {REMINDER_PLACEHOLDER_OPTIONS.map(
                  (option: ReminderPlaceholderOption) => (
                    <Button
                      key={option.placeholder}
                      variant="outline"
                      size="sm"
                      onClick={() => handleInsert(option.placeholder)}
                    >
                      {option.label} {option.placeholder}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-sm text-muted-foreground">渲染预览</div>
              <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                {preview || '（模板为空）'}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving || !template.trim()}
              >
                {saving ? '保存中...' : '保存模板'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReminderSettingDialog;
