import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fundFlowApi } from '@client/src/api';
import { extractErrorMessage } from '@client/src/pages/Inventory/inventory-utils';
import { formatMoney } from '@client/src/pages/Finance/finance-utils';
import { useAuth } from '@client/src/hooks/use-auth';
import type {
  FundAccount,
  FundFlowCategory,
  FundFlowItem,
  FundFlowListResponse,
  FundFlowSummary,
  FundFlowType,
} from '@shared/finance-contract';
import {
  FUND_ACCOUNTS,
  FUND_FLOW_CATEGORIES,
  FUND_FLOW_TYPES,
} from '@shared/finance-contract';
import FundFlowManualDialog from './FundFlowManualDialog';

const ALL_VALUE: string = 'all';
const DEFAULT_PAGE_SIZE: number = 20;

/** 汇总卡片 */
const SummaryCard: React.FC<{
  label: string;
  value: number | null;
  valueClassName?: string;
}> = ({ label, value, valueClassName }) => (
  <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p
      className={`mt-2 text-2xl font-semibold tabular-nums ${valueClassName ?? ''}`}
    >
      {value === null ? '-' : formatMoney(value)}
    </p>
  </div>
);

/** 收支类型标签 */
const FundFlowTypeTag: React.FC<{ type: FundFlowType }> = ({ type }) => {
  if (type === '收入') {
    return (
      <span className="inline-flex rounded-full bg-[hsl(152_65%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(152_65%_30%)]">
        收入
      </span>
    );
  }
  if (type === '支出') {
    return (
      <span className="inline-flex rounded-full bg-[hsl(4_85%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(4_85%_35%)]">
        支出
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[hsl(220_10%_96%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(220_10%_50%)]">
      转账
    </span>
  );
};

/** 资金流水：账户/类型/分类/日期筛选 + 余额汇总 + 手工录入 */
const FundFlowsPage: React.FC = () => {
  const { hasPerm } = useAuth();
  const [account, setAccount] = useState<string>(ALL_VALUE);
  const [type, setType] = useState<string>(ALL_VALUE);
  const [category, setCategory] = useState<string>(ALL_VALUE);
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<FundFlowListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [manualOpen, setManualOpen] = useState<boolean>(false);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result: FundFlowListResponse = await fundFlowApi.listFundFlows({
        account: account !== ALL_VALUE ? account : undefined,
        type: type !== ALL_VALUE ? type : undefined,
        category: category !== ALL_VALUE ? category : undefined,
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
  }, [account, type, category, dateStart, dateEnd, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReset = useCallback((): void => {
    setAccount(ALL_VALUE);
    setType(ALL_VALUE);
    setCategory(ALL_VALUE);
    setDateStart('');
    setDateEnd('');
    setPage(1);
  }, []);

  const summary: FundFlowSummary | null = data?.summary ?? null;
  const closingNegative: boolean = summary !== null && summary.closingBalance < 0;

  const columns: TableColumnsType<FundFlowItem> = useMemo(
    () => [
      {
        title: '流水号',
        dataIndex: 'flowNo',
        fixed: 'left',
        width: 170,
        render: (value: string) => (
          <span className="font-mono text-sm">{value}</span>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: 90,
        render: (value: FundFlowType) => <FundFlowTypeTag type={value} />,
      },
      {
        title: '分类',
        dataIndex: 'category',
        width: 110,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 140,
        align: 'right',
        render: (value: number, record: FundFlowItem) => {
          if (record.type === '收入') {
            return (
              <span className="font-semibold tabular-nums text-[hsl(152_65%_30%)]">
                +{formatMoney(value)}
              </span>
            );
          }
          if (record.type === '支出') {
            return (
              <span className="font-semibold tabular-nums text-[hsl(4_85%_35%)]">
                -{formatMoney(value)}
              </span>
            );
          }
          return (
            <span className="font-semibold tabular-nums">
              {formatMoney(value)}
            </span>
          );
        },
      },
      {
        title: '账户',
        dataIndex: 'account',
        width: 110,
      },
      {
        title: '往来方',
        dataIndex: 'partyName',
        width: 160,
        render: (value: string) => value || '-',
      },
      {
        title: '发生日期',
        dataIndex: 'flowDate',
        width: 120,
      },
      {
        title: '操作人',
        dataIndex: 'operatorName',
        width: 110,
        render: (value: string) => value || '-',
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 160,
        render: (value: string) => (
          <span className="block max-w-[150px] truncate" title={value ?? ''}>
            {value || <span className="text-muted-foreground">-</span>}
          </span>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 150,
        render: (value: string) => (
          <span className="text-muted-foreground">
            {dayjs(value).format('YYYY-MM-DD HH:mm')}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">资金流水</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全部资金收支与转账记录，汇总随当前筛选范围计算
          </p>
        </div>
        {hasPerm('finance_fund_flow_edit') ? (
          <Button size="xl" onClick={() => setManualOpen(true)}>
            <Plus className="size-5" />
            手工录入
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="期初余额"
          value={summary ? summary.openingBalance : null}
        />
        <SummaryCard
          label="本期收入"
          value={summary ? summary.incomeAmount : null}
          valueClassName="text-[hsl(152_65%_30%)]"
        />
        <SummaryCard
          label="本期支出"
          value={summary ? summary.expenseAmount : null}
          valueClassName="text-[hsl(4_85%_35%)]"
        />
        <SummaryCard
          label="期末余额"
          value={summary ? summary.closingBalance : null}
          valueClassName={closingNegative ? 'text-[hsl(4_85%_35%)]' : ''}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <Select
          value={account}
          onValueChange={(value: string) => {
            setAccount(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部账户" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部账户</SelectItem>
            {FUND_ACCOUNTS.map((item: FundAccount): React.ReactNode => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {FUND_FLOW_TYPES.map((item: FundFlowType): React.ReactNode => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(value: string) => {
            setCategory(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部分类</SelectItem>
            {FUND_FLOW_CATEGORIES.map(
              (item: FundFlowCategory): React.ReactNode => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ),
            )}
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

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={Array.isArray(data?.items) ? data.items : []}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400, y: 500 }}
          locale={{ emptyText: '暂无资金流水' }}
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

      <FundFlowManualDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onCreated={() => void loadList()}
      />
    </div>
  );
};

export default FundFlowsPage;
