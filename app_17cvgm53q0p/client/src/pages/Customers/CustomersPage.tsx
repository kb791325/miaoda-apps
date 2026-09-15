import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import dayjs from 'dayjs';
import { CalendarIcon, Plus, Search, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { UserSelect } from '@/components/business-ui/user-select';
import { CUSTOMER_GRADES, type Customer } from '@shared/customer';
import type { LatestReminderItem } from '@shared/reminder';
import {
  deleteCustomer,
  fetchCustomers,
  updateCustomerStage,
} from '@/api/customer';
import { fetchLatestReminders } from '@/api/reminder';
import CustomersTable from './CustomersTable';
import CustomerKanban from './CustomerKanban';
import SalesFunnelChart from '@client/src/pages/Dashboard/SalesFunnelChart';
import CustomerFormDialog from './CustomerFormDialog';
import CustomerProfileDialog from './CustomerProfileDialog';
import ReminderDialog from './ReminderDialog';
import ReminderSettingDialog from './ReminderSettingDialog';
import { useAuth } from '@client/src/hooks/use-auth';
import { extractErrorMessage, isFollowUpDue } from './customer-utils';

const ALL_GRADES = '__all__';

interface CreatedRange {
  from: Date | undefined;
  to: Date | undefined;
}

type CustomersView = 'list' | 'kanban' | 'pending';

const CustomersPage: FC = () => {
  const { hasPerm } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<CustomersView>('list');
  const [keyword, setKeyword] = useState(
    () => searchParams.get('keyword') ?? '',
  );
  const [debouncedKeyword, setDebouncedKeyword] = useState(
    () => keyword.trim(),
  );
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(
    null,
  );
  const [gradeFilter, setGradeFilter] = useState(ALL_GRADES);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [createdRange, setCreatedRange] = useState<CreatedRange>({
    from: undefined,
    to: undefined,
  });
  const [reminderMap, setReminderMap] = useState<
    Record<string, LatestReminderItem>
  >({});
  const [remindCustomer, setRemindCustomer] = useState<Customer | null>(
    null,
  );
  const [settingOpen, setSettingOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const hasActiveFilter: boolean =
    gradeFilter !== ALL_GRADES ||
    ownerFilter !== null ||
    Boolean(createdRange.from || createdRange.to);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCustomers({
        keyword: debouncedKeyword || undefined,
        grade: gradeFilter === ALL_GRADES ? undefined : gradeFilter,
        ownerId: ownerFilter ?? undefined,
        createdFrom: createdRange.from
          ? dayjs(createdRange.from).format('YYYY-MM-DD')
          : undefined,
        createdTo: createdRange.to
          ? dayjs(createdRange.to).format('YYYY-MM-DD')
          : undefined,
      });
      setItems(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, gradeFilter, ownerFilter, createdRange]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const pendingItems = useMemo(
    () =>
      items.filter((customer: Customer): boolean =>
        isFollowUpDue(customer.crm.nextFollowUpAt),
      ),
    [items],
  );

  const pendingIdsKey: string = useMemo(
    () =>
      pendingItems
        .map((customer: Customer): string => customer.id)
        .join(','),
    [pendingItems],
  );

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (view !== 'pending' || !pendingIdsKey) {
      setReminderMap({});
      return;
    }
    let cancelled = false;
    fetchLatestReminders(pendingIdsKey.split(','))
      .then((res: { items?: LatestReminderItem[] }) => {
        if (cancelled) return;
        const map: Record<string, LatestReminderItem> = {};
        for (const item of res.items ?? []) {
          map[item.customerId] = item;
        }
        setReminderMap(map);
      })
      .catch((error: unknown) => {
        logger.warn('查询最近提醒失败', error);
      });
    return () => {
      cancelled = true;
    };
  }, [view, pendingIdsKey]);

  const handleRemindSent = useCallback((customerId: string): void => {
    setHighlightId(customerId);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightId(null);
      highlightTimerRef.current = null;
    }, 3000);
    fetchLatestReminders([customerId])
      .then((res: { items?: LatestReminderItem[] }) => {
        const item: LatestReminderItem | undefined = (res.items ?? [])[0];
        if (!item) return;
        setReminderMap(
          (prev: Record<string, LatestReminderItem>): Record<
            string,
            LatestReminderItem
          > => ({ ...prev, [item.customerId]: item }),
        );
      })
      .catch((error: unknown) => {
        logger.warn('刷新提醒状态失败', error);
      });
  }, []);

  const handleEdit = (customer: Customer): void => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleCreate = (): void => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const handleFormClose = (): void => {
    setFormOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (customer: Customer): Promise<void> => {
    try {
      await deleteCustomer(customer.id);
      toast.success(`客户「${customer.customerName}」已删除`);
      void loadCustomers();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleResetFilters = (): void => {
    setGradeFilter(ALL_GRADES);
    setOwnerFilter(null);
    setCreatedRange({ from: undefined, to: undefined });
  };

  const createdRangeLabel: string =
    createdRange.from || createdRange.to
      ? `${createdRange.from ? dayjs(createdRange.from).format('YYYY-MM-DD') : '不限'} ~ ${createdRange.to ? dayjs(createdRange.to).format('YYYY-MM-DD') : '不限'}`
      : '';

  const handleStageChange = async (
    customer: Customer,
    stage: string,
  ): Promise<void> => {
    setItems((prev) =>
      prev.map((item: Customer): Customer =>
        item.id === customer.id
          ? { ...item, crm: { ...item.crm, salesStage: stage } }
          : item,
      ),
    );
    try {
      await updateCustomerStage(customer.id, stage);
      toast.success(`「${customer.customerName}」已移至「${stage}」`);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
      void loadCustomers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">客户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 位客户
            {view === 'pending' ? `，${pendingItems.length} 位待跟进` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setKeyword(e.target.value)
              }
              placeholder="搜索客户姓名 / 手机号"
              className="w-[300px] pl-9"
            />
          </div>
          {hasPerm('customer:manage') ? (
            <Button onClick={handleCreate}>
              <Plus className="mr-1 h-4 w-4" />
              新增客户
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="客户等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GRADES}>全部等级</SelectItem>
            {CUSTOMER_GRADES.map((grade: string) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-[160px]">
          <UserSelect
            value={ownerFilter}
            onChange={(value: string | null) => setOwnerFilter(value)}
            placeholder="按负责销售筛选"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 min-w-[210px] justify-start font-normal text-sm">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {createdRangeLabel || '按创建时间筛选'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={createdRange}
              onSelect={(selected: CreatedRange | undefined) =>
                setCreatedRange(selected ?? { from: undefined, to: undefined })
              }
            />
          </PopoverContent>
        </Popover>
        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            <X className="mr-1 h-4 w-4" />
            清除筛选
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={view}
          onValueChange={(value: string) =>
            setView(value as CustomersView)
          }
        >
          <TabsList>
            <TabsTrigger value="list">客户列表</TabsTrigger>
            <TabsTrigger value="kanban">销售进度</TabsTrigger>
            <TabsTrigger value="pending">
              待跟进
              {pendingItems.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs tabular-nums text-destructive">
                  {pendingItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {view === 'pending' && hasPerm('customer:manage') ? (
          <Button variant="outline" onClick={() => setSettingOpen(true)}>
            <Settings2 className="mr-1 h-4 w-4" />
            提醒设置
          </Button>
        ) : null}
      </div>

      {view === 'kanban' ? (
        <div className="space-y-6">
          <SalesFunnelChart
            customers={items}
            loading={loading}
            onRetry={() => void loadCustomers()}
          />
          <CustomerKanban items={items} onStageChange={handleStageChange} />
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <CustomersTable
              items={view === 'pending' ? pendingItems : items}
              loading={loading}
              onEdit={handleEdit}
              onViewProfile={(customer: Customer) =>
                setProfileCustomer(customer)
              }
              onDelete={(customer: Customer) => void handleDelete(customer)}
              onRemind={
                view === 'pending' && hasPerm('customer:manage')
                  ? setRemindCustomer
                  : undefined
              }
              reminderMap={view === 'pending' ? reminderMap : undefined}
              highlightId={highlightId}
            />
          </CardContent>
        </Card>
      )}

      {view === 'pending' && pendingItems.length === 0 && !loading && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          暂无待跟进客户（下次跟进时间为今天或已过期的客户会出现在这里）
        </div>
      )}

      <CustomerFormDialog
        open={formOpen}
        customer={editingCustomer}
        onClose={handleFormClose}
        onSuccess={() => void loadCustomers()}
      />

      <CustomerProfileDialog
        open={profileCustomer !== null}
        customer={profileCustomer}
        onClose={() => setProfileCustomer(null)}
        onChanged={() => void loadCustomers()}
      />

      <ReminderDialog
        open={remindCustomer !== null}
        customer={remindCustomer}
        onClose={() => setRemindCustomer(null)}
        onSent={(customerId: string) => handleRemindSent(customerId)}
        onOwnerChanged={() => void loadCustomers()}
      />

      <ReminderSettingDialog
        open={settingOpen}
        onClose={() => setSettingOpen(false)}
      />
    </div>
  );
};

export default CustomersPage;
