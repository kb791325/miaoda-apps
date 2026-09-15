import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, RotateCcw } from 'lucide-react';
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
import { reconciliationApi } from '@client/src/api';
import {
  extractErrorMessage,
  formatMoney,
} from '@client/src/pages/Inventory/inventory-utils';
import { useAuth } from '@client/src/hooks/use-auth';
import type {
  ReconListResponse,
  ReconciliationItem,
} from '@shared/finance-contract';
import GenerateReconDialog from './GenerateReconDialog';

const ALL_VALUE = 'all';
const DEFAULT_PAGE_SIZE = 20;

/** 对账单列表：类型/状态/期间筛选 + 生成入口 */
const ReconciliationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPerm } = useAuth();
  const [type, setType] = useState<string>(ALL_VALUE);
  const [status, setStatus] = useState<string>(ALL_VALUE);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ReconListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await reconciliationApi.listReconciliations({
        type: type !== ALL_VALUE ? type : undefined,
        status: status !== ALL_VALUE ? status : undefined,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
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
  }, [type, status, periodStart, periodEnd, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReset = useCallback((): void => {
    setType(ALL_VALUE);
    setStatus(ALL_VALUE);
    setPeriodStart('');
    setPeriodEnd('');
    setPage(1);
  }, []);

  const columns: TableColumnsType<ReconciliationItem> = [
    {
      title: '对账单号',
      dataIndex: 'reconNo',
      fixed: 'left',
      width: 180,
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 110,
      render: (value: string) => (
        <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {value}
        </span>
      ),
    },
    {
      title: '对账对象',
      dataIndex: 'partyName',
      fixed: 'left',
      width: 170,
      render: (value: string) => value || '-',
    },
    {
      title: '对账期间',
      key: 'period',
      width: 200,
      render: (_: unknown, record: ReconciliationItem) =>
        `${record.periodStart} ~ ${record.periodEnd}`,
    },
    {
      title: '本期发生额',
      dataIndex: 'totalAmount',
      width: 130,
      render: (value: number) => (
        <span className="font-semibold tabular-nums">
          {formatMoney(value)}
        </span>
      ),
    },
    {
      title: '本期已收',
      dataIndex: 'receivedAmount',
      width: 130,
      render: (value: number) => (
        <span className="tabular-nums text-[hsl(152_65%_30%)]">
          {formatMoney(value)}
        </span>
      ),
    },
    {
      title: '期末未收',
      dataIndex: 'unpaidAmount',
      width: 130,
      render: (value: number) => (
        <span className="font-semibold tabular-nums text-[hsl(4_85%_35%)]">
          {formatMoney(value)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string, record: ReconciliationItem) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            value === '已确认'
              ? 'bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]'
              : 'bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      title: '确认时间',
      dataIndex: 'confirmedAt',
      width: 150,
      render: (value: string | null) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 110,
      render: (_: unknown, record: ReconciliationItem) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/reconciliations/${record.id}`)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">对账单</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            按客户/供应商与账期汇总往来明细，支持分享在线确认
          </p>
        </div>
        {hasPerm('finance:recon:edit') ? (
          <Button size="xl" onClick={() => setCreateOpen(true)} data-ai-section-type="button">
            <Plus className="size-4" />
            生成对账单
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <Select
          value={type}
          onValueChange={(value: string) => {
            setType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部类型</SelectItem>
            <SelectItem value="客户对账">客户对账</SelectItem>
            <SelectItem value="供应商对账">供应商对账</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部状态</SelectItem>
            <SelectItem value="待确认">待确认</SelectItem>
            <SelectItem value="已确认">已确认</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-40">
          <DateField
            value={periodStart}
            placeholder="期间起"
            onSelect={(value: string) => {
              setPeriodStart(value);
              setPage(1);
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">至</span>
        <div className="w-40">
          <DateField
            value={periodEnd}
            placeholder="期间止"
            onSelect={(value: string) => {
              setPeriodEnd(value);
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
          scroll={{ x: 1700, y: 500 }}
          locale={{ emptyText: '暂无对账单' }}
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

      <GenerateReconDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default ReconciliationsPage;
