import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DateField from '@/components/date-field';
import {
  customerApi,
  receivableApi,
} from '@client/src/api';
import {
  extractErrorMessage,
  formatMoney,
} from '@client/src/pages/Inventory/inventory-utils';
import { useAuth } from '@client/src/hooks/use-auth';
import type { Customer } from '@shared/customer';
import type {
  AgingBucket,
  ArListResponse,
  ArReceivableItem,
} from '@shared/finance-contract';
import ArDetailDialog from './ArDetailDialog';
import { LedgerStatusTag, LedgerSummaryCards } from './finance-contract-ui';

const ALL_VALUE = 'all';
const DEFAULT_PAGE_SIZE = 20;
const OVERDUE_ONLY_VALUE = '1';

const AGING_OPTIONS: { value: AgingBucket; label: string }[] = [
  { value: '0-30', label: '0-30天' },
  { value: '31-60', label: '31-60天' },
  { value: '61-90', label: '61-90天' },
  { value: '90+', label: '90天以上' },
];

/** 应收账款列表：客户/状态/到期日筛选 + 汇总卡 + 详情/编辑 */
const ReceivablesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPerm } = useAuth();
  const [customerId, setCustomerId] = useState<string>(
    () => searchParams.get('customerId') ?? ALL_VALUE,
  );
  const [status, setStatus] = useState<string>(ALL_VALUE);
  const [dueStart, setDueStart] = useState<string>('');
  const [dueEnd, setDueEnd] = useState<string>('');
  const [overdue, setOverdue] = useState<string>(() =>
    searchParams.get('overdue') === OVERDUE_ONLY_VALUE
      ? OVERDUE_ONLY_VALUE
      : ALL_VALUE,
  );
  const [aging, setAging] = useState<string>(() => {
    const initial: string | null = searchParams.get('aging');
    return initial &&
      AGING_OPTIONS.some((option) => option.value === initial)
      ? initial
      : ALL_VALUE;
  });
  const [overLimit, setOverLimit] = useState<string>(() =>
    searchParams.get('overLimit') === OVERDUE_ONLY_VALUE
      ? OVERDUE_ONLY_VALUE
      : ALL_VALUE,
  );
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ArListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<ArReceivableItem | null>(null);
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editRemark, setEditRemark] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    customerApi
      .fetchCustomers({})
      .then((res) => {
        if (mounted) setCustomers(Array.isArray(res.items) ? res.items : []);
      })
      .catch((error: unknown) => {
        if (mounted) toast.error(extractErrorMessage(error));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await receivableApi.listReceivables({
        customerId: customerId !== ALL_VALUE ? customerId : undefined,
        status: status !== ALL_VALUE ? status : undefined,
        dueStart: dueStart || undefined,
        dueEnd: dueEnd || undefined,
        overdue: overdue !== ALL_VALUE ? overdue : undefined,
        aging: aging !== ALL_VALUE ? aging : undefined,
        overLimit: overLimit !== ALL_VALUE ? overLimit : undefined,
        page,
        pageSize,
      });
      setData(result);
    } catch (error: unknown) {
      setData(null);
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [
    customerId,
    status,
    dueStart,
    dueEnd,
    overdue,
    aging,
    overLimit,
    page,
    pageSize,
  ]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReset = useCallback((): void => {
    setCustomerId(ALL_VALUE);
    setStatus(ALL_VALUE);
    setDueStart('');
    setDueEnd('');
    setOverdue(ALL_VALUE);
    setAging(ALL_VALUE);
    setOverLimit(ALL_VALUE);
    setPage(1);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const openEdit = (item: ArReceivableItem): void => {
    setEditItem(item);
    setEditDueDate(item.dueDate ?? '');
    setEditRemark(item.remark ?? '');
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editItem) return;
    setSaving(true);
    try {
      await receivableApi.updateReceivable(editItem.id, {
        dueDate: editDueDate || null,
        remark: editRemark,
      });
      toast.success('应收账款已更新');
      setEditItem(null);
      await loadList();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<ArReceivableItem> = useMemo(
    () => [
      {
        title: '应收单号',
        dataIndex: 'receivableNo',
        fixed: 'left',
        width: 170,
        render: (value: string) => (
          <span className="font-mono text-sm">{value}</span>
        ),
      },
      {
        title: '客户',
        dataIndex: 'customerName',
        fixed: 'left',
        width: 190,
        render: (value: string, record: ArReceivableItem) => (
          <span className="flex items-center gap-1.5">
            <span>{value || '-'}</span>
            {record.overLimit ? (
              <span
                title="客户欠款已超信用额度"
                className="rounded-full bg-[hsl(4_85%_95%)] px-2 py-0.5 text-xs font-medium text-[hsl(4_85%_35%)]"
              >
                超额
              </span>
            ) : null}
          </span>
        ),
      },
      {
        title: '关联订单',
        dataIndex: 'orderNo',
        width: 150,
        render: (value: string) => (
          <span className="font-mono text-sm text-muted-foreground">
            {value || '-'}
          </span>
        ),
      },
      {
        title: '应收金额',
        dataIndex: 'totalAmount',
        width: 120,
        render: (value: number) => (
          <span className="font-semibold tabular-nums">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        title: '已收金额',
        dataIndex: 'receivedAmount',
        width: 120,
        render: (value: number) => (
          <span className="tabular-nums text-[hsl(152_65%_30%)]">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        title: '未收金额',
        dataIndex: 'unpaidAmount',
        width: 120,
        render: (value: number) => (
          <span className="font-semibold tabular-nums text-[hsl(4_85%_35%)]">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 160,
        render: (value: string, record: ArReceivableItem) => (
          <span className="flex flex-wrap items-center gap-1">
            <LedgerStatusTag status={value} />
            {record.overdueDays > 0 && value !== '已结清' ? (
              <span className="rounded-full bg-[hsl(4_85%_95%)] px-2 py-0.5 text-xs font-medium text-[hsl(4_85%_35%)]">
                逾期 {record.overdueDays} 天
              </span>
            ) : null}
          </span>
        ),
      },
      {
        title: '到期日期',
        dataIndex: 'dueDate',
        width: 120,
        render: (value: string) => {
          if (!value) return <span className="text-muted-foreground">-</span>;
          return <span>{value}</span>;
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 150,
        render: (value: string) => (
          <span className="text-muted-foreground">
            {dayjs(value).format('YYYY-MM-DD')}
          </span>
        ),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 150,
        render: (value: string) => (
          <span className="block max-w-[140px] truncate" title={value ?? ''}>
            {value || <span className="text-muted-foreground">-</span>}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 150,
        render: (_: unknown, record: ArReceivableItem) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDetailId(record.id);
                setDetailOpen(true);
              }}
            >
              详情
            </Button>
            {hasPerm('finance:receivable:edit') ? (
              <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                <Pencil className="size-4" />
                编辑
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [hasPerm],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">应收账款</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          订单产生的应收记录，支持按客户、状态、到期日筛选
        </p>
      </div>

      <LedgerSummaryCards summary={data?.summary ?? null} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <Select
          value={customerId}
          onValueChange={(value: string) => {
            setCustomerId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="全部客户" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部客户</SelectItem>
            {customers.map((item: Customer): React.ReactNode => (
              <SelectItem key={item.id} value={item.id}>
                {item.customerName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部状态</SelectItem>
            {['未结清', '部分结清', '已结清', '已作废'].map(
              (item: string): React.ReactNode => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={overdue}
          onValueChange={(value: string) => {
            setOverdue(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部</SelectItem>
            <SelectItem value={OVERDUE_ONLY_VALUE}>只看逾期</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={aging}
          onValueChange={(value: string) => {
            setAging(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部账龄" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部账龄</SelectItem>
            {AGING_OPTIONS.map(
              (option): React.ReactNode => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={overLimit}
          onValueChange={(value: string) => {
            setOverLimit(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部</SelectItem>
            <SelectItem value={OVERDUE_ONLY_VALUE}>只看超额</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-40">
          <DateField
            value={dueStart}
            placeholder="到期起"
            onSelect={(value: string) => {
              setDueStart(value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">至</span>
        <div className="w-40">
          <DateField
            value={dueEnd}
            placeholder="到期止"
            onSelect={(value: string) => {
              setDueEnd(value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" />
          重置
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={data?.items ?? []}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500, y: 500 }}
          locale={{ emptyText: '暂无应收账款' }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            onChange: (nextPage: number, nextPageSize: number): void => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </div>

      <ArDetailDialog
        id={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <Dialog open={editItem !== null} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              编辑应收账款{editItem ? `：${editItem.receivableNo}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold">到期日期</label>
              <div className="w-full">
                <DateField
                  value={editDueDate}
                  placeholder="选择到期日期"
                  onSelect={setEditDueDate}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold">备注</label>
              <Input
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                placeholder="备注信息"
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceivablesPage;
