import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DateField from '@/components/date-field';
import {
  customerApi,
  receiptPaymentApi,
  supplierApi,
} from '@client/src/api';
import {
  extractErrorMessage,
  formatMoney,
} from '@client/src/pages/Inventory/inventory-utils';
import type {
  ReceiptListResponse,
  ReceiptPaymentRecord,
} from '@shared/finance-contract';
import { PAYMENT_METHODS } from '@shared/finance-contract';
import ReceiptDetailDialog from './ReceiptDetailDialog';

const ALL_VALUE = 'all';
const DEFAULT_PAGE_SIZE = 20;

/** 收付款记录列表：类型/对象/方式/日期筛选 */
const ReceiptRecordsPage: React.FC = () => {
  const [type, setType] = useState<string>(ALL_VALUE);
  const [partyType, setPartyType] = useState<'客户' | '供应商'>('客户');
  const [partyId, setPartyId] = useState<string>(ALL_VALUE);
  const [method, setMethod] = useState<string>(ALL_VALUE);
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ReceiptListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    customerApi
      .fetchCustomers({})
      .then((res) => {
        if (mounted)
          setCustomers(
            (Array.isArray(res.items) ? res.items : []).map((c) => ({
              id: c.id,
              name: c.customerName,
            })),
          );
      })
      .catch(() => undefined);
    supplierApi
      .listSupplierOptions()
      .then((items) => {
        if (mounted)
          setSuppliers(items.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await receiptPaymentApi.listReceiptPayments({
        type: type !== ALL_VALUE ? type : undefined,
        partyId: partyId !== ALL_VALUE ? partyId : undefined,
        paymentMethod: method !== ALL_VALUE ? method : undefined,
        dateStart: dateStart || undefined,
        dateEnd: dateEnd || undefined,
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
  }, [type, partyId, method, dateStart, dateEnd, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReset = useCallback((): void => {
    setType(ALL_VALUE);
    setPartyId(ALL_VALUE);
    setMethod(ALL_VALUE);
    setDateStart('');
    setDateEnd('');
    setPage(1);
  }, []);

  const partyOptions = useMemo(
    () => (partyType === '客户' ? customers : suppliers),
    [partyType, customers, suppliers],
  );

  const columns: TableColumnsType<ReceiptPaymentRecord> = [
    {
      title: '类型',
      dataIndex: 'type',
      fixed: 'left',
      width: 90,
      render: (value: string) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            value === '收款'
              ? 'bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]'
              : 'bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      title: '对象',
      dataIndex: 'partyName',
      fixed: 'left',
      width: 160,
      render: (value: string) => value || '-',
    },
    {
      title: '关联单号',
      dataIndex: 'relatedNo',
      width: 170,
      render: (value: string) => <span className="font-mono text-sm">{value}</span>,
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
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number, record: ReceiptPaymentRecord) => (
        <span
          className={`font-semibold tabular-nums ${
            record.type === '收款'
              ? 'text-[hsl(152_65%_30%)]'
              : 'text-[hsl(4_85%_35%)]'
          }`}
        >
          {formatMoney(value)}
        </span>
      ),
    },
    { title: '方式', dataIndex: 'paymentMethod', width: 100 },
    {
      title: '日期',
      dataIndex: 'paymentDate',
      width: 120,
      render: (value: string) => value || '-',
    },
    {
      title: '经手人',
      dataIndex: 'operatorName',
      width: 110,
      render: (value: string) => value || '-',
    },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value || '-'}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (value: string) => (
        <span className="block max-w-[160px] truncate" title={value ?? ''}>
          {value || <span className="text-muted-foreground">-</span>}
        </span>
      ),
    },
  ];

  const handleRowClick = (record: ReceiptPaymentRecord): void => {
    setDetailId(record.id);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">收付款记录</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全部收款/付款流水，支持按类型、对象、方式、日期筛选
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <Select
          value={type}
          onValueChange={(value: string) => {
            setType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部类型</SelectItem>
            <SelectItem value="收款">收款</SelectItem>
            <SelectItem value="付款">付款</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={partyType}
          onValueChange={(value: string) => {
            setPartyType(value as '客户' | '供应商');
            setPartyId(ALL_VALUE);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="对象类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="客户">客户</SelectItem>
            <SelectItem value="供应商">供应商</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={partyId}
          onValueChange={(value: string) => {
            setPartyId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder={`全部${partyType}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部{partyType}</SelectItem>
            {partyOptions.map(
              (item: { id: string; name: string }): React.ReactNode => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={method}
          onValueChange={(value: string) => {
            setMethod(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部方式</SelectItem>
            {PAYMENT_METHODS.map((item: string): React.ReactNode => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-40">
          <DateField
            value={dateStart}
            placeholder="日期起"
            onSelect={(value: string) => {
              setDateStart(value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">至</span>
        <div className="w-40">
          <DateField
            value={dateEnd}
            placeholder="日期止"
            onSelect={(value: string) => {
              setDateEnd(value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" />
          重置
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-3 text-base shadow-sm">
        当前筛选合计：
        <span className="ml-1 text-xl font-semibold tabular-nums text-primary">
          {formatMoney(data?.totalAmount ?? 0)}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={data?.items ?? []}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500, y: 500 }}
          locale={{ emptyText: '暂无收付款记录' }}
          onRow={(record: ReceiptPaymentRecord) => ({
            onClick: () => handleRowClick(record),
            className: 'cursor-pointer hover:bg-[hsl(220_20%_97%)]',
          })}
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

      <ReceiptDetailDialog
        id={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default ReceiptRecordsPage;
