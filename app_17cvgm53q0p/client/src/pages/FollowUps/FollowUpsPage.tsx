import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Customer } from '@shared/customer';
import type { FollowUpRecord } from '@shared/follow-up';
import { fetchCustomers } from '@/api/customer';
import { fetchFollowUps } from '@/api/follow-up';
import { useAuth } from '@client/src/hooks/use-auth';
import { extractErrorMessage } from '@/pages/Customers/customer-utils';
import FollowUpFormDialog from './FollowUpFormDialog';
import FollowUpDetailDialog from './FollowUpDetailDialog';
import FollowUpGroupCard, {
  type CustomerFollowUpGroup,
} from './FollowUpGroupCard';

const ALL_CUSTOMER_VALUE = 'all';

const buildGroups = (items: FollowUpRecord[]): CustomerFollowUpGroup[] => {
  const groups: CustomerFollowUpGroup[] = [];
  const indexById = new Map<string, number>();
  for (const item of items) {
    const existingIndex = indexById.get(item.customerId);
    if (existingIndex === undefined) {
      indexById.set(item.customerId, groups.length);
      groups.push({
        customerId: item.customerId,
        customerName: item.customerName,
        records: [item],
      });
    } else {
      groups[existingIndex].records.push(item);
    }
  }
  return groups;
};

const FollowUpsPage: FC = () => {
  const { hasPerm } = useAuth();
  const [items, setItems] = useState<FollowUpRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string>(
    ALL_CUSTOMER_VALUE,
  );
  const [keyword, setKeyword] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<FollowUpRecord | null>(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const customerId =
        customerFilter === ALL_CUSTOMER_VALUE ? undefined : customerFilter;
      const res = await fetchFollowUps(customerId);
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [customerFilter]);

  useEffect(() => {
    void loadFollowUps();
  }, [loadFollowUps]);

  useEffect(() => {
    fetchCustomers()
      .then((res) => setCustomers(Array.isArray(res.items) ? res.items : []))
      .catch((error: unknown) => toast.error(extractErrorMessage(error)));
  }, []);

  const visibleGroups = useMemo(() => {
    const groups = buildGroups(items);
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return groups;
    return groups.filter((group: CustomerFollowUpGroup) =>
      group.customerName.toLowerCase().includes(trimmed),
    );
  }, [items, keyword]);

  const toggleGroup = (customerId: string): void => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">跟进记录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {items?.length ?? 0} 条跟进记录、{visibleGroups?.length ?? 0}{' '}
            个客户，新增后将自动更新客户档案
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setKeyword(e.target.value)
              }
              placeholder="搜索客户名称"
              className="w-[300px] pl-9"
            />
          </div>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="按客户筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CUSTOMER_VALUE}>全部客户</SelectItem>
              {customers.map((customer: Customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.customerName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasPerm('followup:manage') ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              新增跟进
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {items?.length === 0 ? '暂无跟进记录' : '未找到匹配的客户'}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group: CustomerFollowUpGroup) => (
            <FollowUpGroupCard
              key={group.customerId}
              group={group}
              expanded={!collapsedIds.has(group.customerId)}
               onToggle={() => toggleGroup(group.customerId)}
               onOpenDetail={setDetailRecord}
             />
          ))}
        </div>
      )}

      <FollowUpFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => void loadFollowUps()}
      />
      <FollowUpDetailDialog
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
      />
    </div>
  );
};

export default FollowUpsPage;
