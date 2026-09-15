import { useEffect, useState, type FC } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Customer } from '@shared/customer';
import {
  renderReminderMessage,
  type ReminderDraftResponse,
} from '@shared/reminder';
import type { UserOption } from '@shared/auth';
import { fetchUserOptions } from '@/api/auth';
import { reassignCustomerOwner } from '@/api/customer';
import {
  fetchReminderDraft,
  fetchReminderSetting,
  sendReminder,
} from '@/api/reminder';
import { useAuth } from '@client/src/hooks/use-auth';
import { extractErrorMessage } from './customer-utils';

interface ReminderDialogProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSent: (customerId: string, sentAt: string) => void;
  onOwnerChanged?: (customerId: string) => void;
}

const ReminderDialog: FC<ReminderDialogProps> = ({
  open,
  customer,
  onClose,
  onSent,
  onOwnerChanged,
}) => {
  const { hasPerm } = useAuth();
  const canManage: boolean = hasPerm('customer:manage');
  const [draft, setDraft] = useState<ReminderDraftResponse | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');

  const buildMessage = (
    draftRes: ReminderDraftResponse,
    template: string,
  ): string =>
    renderReminderMessage(template, {
      customerName: customer?.customerName ?? '',
      salesName: draftRes.ownerName,
      nextFollowDate: draftRes.nextFollowDate
        ? dayjs(draftRes.nextFollowDate).format('YYYY-MM-DD')
        : '-',
      salesStage: draftRes.salesStage,
    });

  const applyDraft = (
    draftRes: ReminderDraftResponse,
    template: string,
  ): void => {
    setDraft(draftRes);
    setSelectedOwnerId('');
    setMessage(buildMessage(draftRes, template));
  };

  useEffect(() => {
    if (!open || !customer) return;
    let cancelled = false;
    setLoading(true);
    setDraft(null);
    setMessage('');
    setSelectedOwnerId('');
    Promise.all([
      fetchReminderDraft(customer.id),
      fetchReminderSetting(),
    ])
      .then(
        ([draftRes, settingRes]: [
          ReminderDraftResponse,
          { template: string },
        ]) => {
          if (cancelled) return;
          applyDraft(draftRes, settingRes.template);
        },
      )
      .catch((error: unknown) => {
        if (!cancelled) toast.error(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  const blocked: boolean = Boolean(draft?.blockReason);
  const ownerBlocked: boolean = Boolean(draft?.blockCode);

  useEffect(() => {
    if (!open || !ownerBlocked || !canManage) return;
    let cancelled = false;
    fetchUserOptions()
      .then((options: UserOption[]) => {
        if (!cancelled) {
          setUserOptions(Array.isArray(options) ? options : []);
        }
      })
      .catch(() => {
        if (!cancelled) setUserOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ownerBlocked, canManage]);

  const refreshDraft = async (): Promise<void> => {
    if (!customer) return;
    const [draftRes, settingRes]: [
      ReminderDraftResponse,
      { template: string },
    ] = await Promise.all([
      fetchReminderDraft(customer.id),
      fetchReminderSetting(),
    ]);
    applyDraft(draftRes, settingRes.template);
  };

  const handleReassign = async (): Promise<void> => {
    if (!customer || !selectedOwnerId) return;
    setSaving(true);
    try {
      await reassignCustomerOwner(customer.id, selectedOwnerId);
      toast.success('负责销售已改派');
      onOwnerChanged?.(customer.id);
      await refreshDraft();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!customer) return;
    setSending(true);
    try {
      const res = await sendReminder({
        customerId: customer.id,
        customerName: customer.customerName,
        message,
      });
      toast.success(`提醒已发送给 ${res.receiverName}`);
      onSent(customer.id, res.sentAt);
      onClose();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            提醒跟进{customer ? `：${customer.customerName}` : ''}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            正在加载提醒信息...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <div>
                <div className="text-muted-foreground">负责销售</div>
                <div className="mt-0.5 font-medium">
                  {draft?.ownerName || '-'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">下次跟进</div>
                <div className="mt-0.5 font-medium tabular-nums">
                  {draft?.nextFollowDate
                    ? dayjs(draft.nextFollowDate).format('YYYY-MM-DD')
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">销售阶段</div>
                <div className="mt-0.5 font-medium">
                  {draft?.salesStage || '-'}
                </div>
              </div>
            </div>
            {blocked && (
              <div className="space-y-2">
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {draft?.blockReason}
                </div>
                {canManage && ownerBlocked && (
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">改派负责销售</div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedOwnerId}
                        onValueChange={setSelectedOwnerId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择新负责销售" />
                        </SelectTrigger>
                        <SelectContent>
                          {userOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              暂无可选系统用户
                            </div>
                          ) : (
                            userOptions.map((user: UserOption) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        className="shrink-0"
                        disabled={!selectedOwnerId || saving}
                        onClick={() => void handleReassign()}
                      >
                        {saving ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="text-base font-semibold">提醒内容</div>
              <Textarea
                rows={6}
                value={message}
                disabled={blocked}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setMessage(e.target.value)
                }
                placeholder="提醒内容"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                onClick={() => void handleSend()}
                disabled={blocked || sending || !message.trim()}
              >
                <BellRing className="mr-1 h-4 w-4" />
                {sending ? '发送中...' : '确认发送'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
