import {
  useEffect,
  useRef,
  useState,
  type FC,
} from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import DateField from '@/components/date-field';
import { SALES_STAGES } from '@shared/customer';
import type { Customer } from '@shared/customer';
import {
  FOLLOW_UP_INTENTS,
  FOLLOW_UP_METHODS,
  type CreateFollowUpRequest,
} from '@shared/follow-up';
import type { UserOption } from '@shared/auth';
import { fetchUserOptions } from '@/api/auth';
import { fetchCustomers } from '@/api/customer';
import {
  createFollowUp,
  fetchFollowUpCurrentUser,
} from '@/api/follow-up';
import { extractErrorMessage } from '@/pages/Customers/customer-utils';

const NO_STAGE_CHANGE = 'no-change';

interface EnumSelectProps {
  value: string | undefined;
  placeholder: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
}

const EnumSelect: FC<EnumSelectProps> = ({
  value,
  placeholder,
  options,
  onValueChange,
}) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((option: string) => (
        <SelectItem key={option} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface FollowUpFormDialogProps {
  open: boolean;
  /** 预设客户（客户详情页入口），不可切换 */
  presetCustomerId?: string;
  presetCustomerName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FollowUpFormState {
  customerId: string;
  followerId: string | null;
  followUpDate: string;
  method: string;
  content: string;
  intent: string;
  demandProduct: string;
  budget: string;
  nextFollowUpDate: string;
  stageChange: string;
}

const buildInitialState = (): FollowUpFormState => ({
  customerId: '',
  followerId: null,
  followUpDate: dayjs().format('YYYY-MM-DD'),
  method: '电话',
  content: '',
  intent: '',
  demandProduct: '',
  budget: '',
  nextFollowUpDate: '',
  stageChange: NO_STAGE_CHANGE,
});

const FollowUpFormDialog: FC<FollowUpFormDialogProps> = ({
  open,
  presetCustomerId,
  presetCustomerName,
  onClose,
  onSuccess,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [form, setForm] = useState<FollowUpFormState>(buildInitialState());
  const [currentUserId, setCurrentUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const followerDefaultedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    followerDefaultedRef.current = false;
    setForm({
      ...buildInitialState(),
      customerId: presetCustomerId ?? '',
    });
    fetchCustomers()
      .then((res) => setCustomers(Array.isArray(res.items) ? res.items : []))
      .catch((error: unknown) => toast.error(extractErrorMessage(error)));
    fetchFollowUpCurrentUser()
      .then((res) => setCurrentUserId(res.userId))
      .catch(() => setCurrentUserId(''));
    fetchUserOptions()
      .then((options: UserOption[]) => setUserOptions(options))
      .catch(() => setUserOptions([]));
  }, [open, presetCustomerId]);

  useEffect(() => {
    if (!open || followerDefaultedRef.current) return;
    if (userOptions.length === 0) return;
    const ownerId = form.customerId
      ? customers.find((customer: Customer) => customer.id === form.customerId)
          ?.crm.ownerId ?? ''
      : '';
    const candidate = ownerId || currentUserId;
    if (!candidate) return;
    const resolved = userOptions.some(
      (user: UserOption) => user.id === candidate,
    )
      ? candidate
      : currentUserId;
    if (!userOptions.some((user: UserOption) => user.id === resolved)) return;
    followerDefaultedRef.current = true;
    setForm((prev) => ({ ...prev, followerId: resolved }));
  }, [open, customers, currentUserId, form.customerId, userOptions]);

  const handleCustomerChange = (customerId: string): void => {
    const ownerId =
      customers.find((customer: Customer) => customer.id === customerId)
        ?.crm.ownerId ?? '';
    const candidate = ownerId || currentUserId;
    const resolved = userOptions.some(
      (user: UserOption) => user.id === candidate,
    )
      ? candidate
      : currentUserId;
    const isValid = userOptions.some(
      (user: UserOption) => user.id === resolved,
    );
    setForm((prev) => ({
      ...prev,
      customerId,
      followerId: isValid ? resolved : null,
    }));
  };

  const update = <K extends keyof FollowUpFormState>(
    key: K,
    value: FollowUpFormState[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId) {
      toast.error('请选择关联客户');
      return;
    }
    if (!form.content.trim()) {
      toast.error('请填写跟进内容');
      return;
    }
    const budgetValue = form.budget === '' ? null : Number(form.budget);
    if (budgetValue !== null && !Number.isFinite(budgetValue)) {
      toast.error('预计预算需为数字');
      return;
    }
    const payload: CreateFollowUpRequest = {
      customerId: form.customerId,
      followerId: form.followerId || undefined,
      followUpAt: dayjs(`${form.followUpDate}T10:00:00`).toISOString(),
      method: form.method,
      content: form.content.trim(),
      intent: form.intent || undefined,
      demandProduct: form.demandProduct,
      budget: budgetValue,
      nextFollowUpAt: form.nextFollowUpDate
        ? dayjs(`${form.nextFollowUpDate}T09:00:00`).toISOString()
        : undefined,
      stageChange:
        form.stageChange === NO_STAGE_CHANGE ? undefined : form.stageChange,
    };
    setSubmitting(true);
    try {
      await createFollowUp(payload);
      toast.success('跟进记录已保存');
      onClose();
      onSuccess();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>新增跟进记录</DialogTitle>
          <DialogDescription>
            保存后将自动更新客户的最近跟进时间、下次跟进时间与销售阶段
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[65vh] grid-cols-2 gap-4 overflow-y-auto pr-1">
          <div className="col-span-2 space-y-1.5">
            <Label>
              关联客户 <span className="text-destructive">*</span>
            </Label>
            {presetCustomerId ? (
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                {presetCustomerName ?? presetCustomerId}
              </div>
            ) : (
              <Select
                value={form.customerId || undefined}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customerName}（{customer.phone}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>跟进人</Label>
            <Select
              value={form.followerId || undefined}
              onValueChange={(value: string) => update('followerId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择跟进人" />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((user: UserOption) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>跟进时间</Label>
            <DateField
              value={form.followUpDate}
              placeholder="选择日期"
              onSelect={(value: string) => update('followUpDate', value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              跟进方式 <span className="text-destructive">*</span>
            </Label>
            <EnumSelect
              value={form.method}
              placeholder="请选择"
              options={FOLLOW_UP_METHODS}
              onValueChange={(value: string) => update('method', value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>
              跟进内容 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={form.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                update('content', e.target.value)
              }
              placeholder="记录本次沟通要点、客户反馈..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>客户意向度</Label>
            <EnumSelect
              value={form.intent || undefined}
              placeholder="请选择"
              options={FOLLOW_UP_INTENTS}
              onValueChange={(value: string) => update('intent', value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>预计预算</Label>
            <Input
              type="number"
              min={0}
              value={form.budget}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update('budget', e.target.value)
              }
              placeholder="选填，单位元"
            />
          </div>
          <div className="space-y-1.5">
            <Label>需求产品</Label>
            <Input
              value={form.demandProduct}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update('demandProduct', e.target.value)
              }
              placeholder="选填"
            />
          </div>
          <div className="space-y-1.5">
            <Label>下次跟进时间</Label>
            <DateField
              value={form.nextFollowUpDate}
              placeholder="选择日期"
              onSelect={(value: string) => update('nextFollowUpDate', value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>阶段变化</Label>
            <Select
              value={form.stageChange}
              onValueChange={(value: string) => update('stageChange', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STAGE_CHANGE}>无阶段变化</SelectItem>
                {SALES_STAGES.map((stage: string) => (
                  <SelectItem key={stage} value={stage}>
                    变更为「{stage}」
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
          >
            取消
          </Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '保存中...' : '保存跟进记录'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowUpFormDialog;
