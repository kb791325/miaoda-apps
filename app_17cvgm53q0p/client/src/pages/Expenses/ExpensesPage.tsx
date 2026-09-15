import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DateField from '@/components/date-field';
import { expenseApi } from '@client/src/api';
import { extractErrorMessage } from '@client/src/pages/Inventory/inventory-utils';
import { formatMoney } from '@client/src/pages/Finance/finance-utils';
import { useAuth } from '@client/src/hooks/use-auth';
import type {
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseItem,
  ExpenseListResponse,
  ExpenseSummary,
} from '@shared/finance-contract';
import {
  EXPENSE_APPROVAL_STATUSES,
  EXPENSE_CATEGORIES,
} from '@shared/finance-contract';
import ExpenseDetailDialog from './ExpenseDetailDialog';
import ExpenseFormDialog from './ExpenseFormDialog';
import ExpenseApproveDialog from './ExpenseApproveDialog';

const ALL_VALUE: string = 'all';
const DEFAULT_PAGE_SIZE: number = 20;

/** 汇总卡片 */
const SummaryCard: React.FC<{
  label: string;
  value: string;
  valueClassName?: string;
}> = ({ label, value, valueClassName }) => (
  <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p
      className={`mt-2 text-2xl font-semibold tabular-nums ${valueClassName ?? ''}`}
    >
      {value}
    </p>
  </div>
);

/** 审批状态标签：待审批黄/已审批绿/已驳回红 */
const ApprovalStatusTag: React.FC<{ status: ExpenseApprovalStatus }> = ({
  status,
}) => {
  if (status === '已审批') {
    return (
      <span className="inline-flex rounded-full bg-[hsl(152_65%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(152_65%_30%)]">
        已审批
      </span>
    );
  }
  if (status === '已驳回') {
    return (
      <span className="inline-flex rounded-full bg-[hsl(4_85%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(4_85%_35%)]">
        已驳回
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[hsl(38_90%_95%)] px-2.5 py-0.5 text-xs font-medium text-[hsl(38_90%_35%)]">
      待审批
    </span>
  );
};

/** 费用管理：分类/审批状态/日期筛选 + 汇总 + 新增/编辑/审批/删除 */
const ExpensesPage: React.FC = () => {
  const { hasPerm } = useAuth();
  const [category, setCategory] = useState<string>(ALL_VALUE);
  const [approvalStatus, setApprovalStatus] = useState<string>(ALL_VALUE);
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailItem, setDetailItem] = useState<ExpenseItem | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitial, setFormInitial] = useState<ExpenseItem | null>(null);
  const [approveItem, setApproveItem] = useState<ExpenseItem | null>(null);
  const [approveOpen, setApproveOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result: ExpenseListResponse = await expenseApi.listExpenses({
        category: category !== ALL_VALUE ? category : undefined,
        approvalStatus: approvalStatus !== ALL_VALUE ? approvalStatus : undefined,
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
  }, [category, approvalStatus, dateStart, dateEnd, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReset = useCallback((): void => {
    setCategory(ALL_VALUE);
    setApprovalStatus(ALL_VALUE);
    setDateStart('');
    setDateEnd('');
    setPage(1);
  }, []);

  const openCreate = (): void => {
    setFormMode('create');
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (item: ExpenseItem): void => {
    setFormMode('edit');
    setFormInitial(item);
    setFormOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await expenseApi.deleteExpense(deleteTarget.id);
      toast.success('费用已删除');
      setDeleteTarget(null);
      await loadList();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const summary: ExpenseSummary | null = data?.summary ?? null;
  const canEdit: boolean = hasPerm('finance_expense_edit');
  const canApprove: boolean = hasPerm('finance_expense_approval');

  const columns: TableColumnsType<ExpenseItem> = useMemo(
    () => [
      {
        title: '费用单号',
        dataIndex: 'expenseNo',
        fixed: 'left',
        width: 170,
        render: (value: string) => (
          <span className="font-mono text-sm">{value}</span>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category',
        width: 100,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 130,
        align: 'right',
        render: (value: number) => (
          <span className="font-semibold tabular-nums">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        title: '发生日期',
        dataIndex: 'expenseDate',
        width: 120,
      },
      {
        title: '报销人',
        dataIndex: 'payerName',
        width: 110,
        render: (value: string) =>
          value || <span className="text-muted-foreground">-</span>,
      },
      {
        title: '支付账户',
        dataIndex: 'account',
        width: 110,
      },
      {
        title: '审批状态',
        dataIndex: 'approvalStatus',
        width: 100,
        render: (value: ExpenseApprovalStatus) => (
          <ApprovalStatusTag status={value} />
        ),
      },
      {
        title: '审批人',
        dataIndex: 'approverName',
        width: 110,
        render: (value: string) =>
          value || <span className="text-muted-foreground">-</span>,
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
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 230,
        render: (_: unknown, record: ExpenseItem) => {
          const pending: boolean = record.approvalStatus === '待审批';
          return (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDetailItem(record);
                  setDetailOpen(true);
                }}
              >
                详情
              </Button>
              {pending && canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                  <Pencil className="size-4" />
                  编辑
                </Button>
              ) : null}
              {pending && canApprove ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setApproveItem(record);
                    setApproveOpen(true);
                  }}
                >
                  审批
                </Button>
              ) : null}
              {pending && canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[hsl(4_85%_35%)]"
                  onClick={() => setDeleteTarget(record)}
                >
                  <Trash2 className="size-4" />
                  删除
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canEdit, canApprove],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">费用管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            日常费用登记与审批，审批通过后自动生成资金流水
          </p>
        </div>
        {canEdit ? (
          <Button size="xl" onClick={openCreate}>
            <Plus className="size-5" />
            新增费用
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="费用总额"
          value={summary ? formatMoney(summary.totalAmount) : '-'}
        />
        <SummaryCard
          label="已审批金额"
          value={summary ? formatMoney(summary.approvedAmount) : '-'}
          valueClassName="text-[hsl(152_65%_30%)]"
        />
        <SummaryCard
          label="待审批笔数"
          value={summary ? `${summary.pendingCount} 笔` : '-'}
          valueClassName={
            summary && summary.pendingCount > 0 ? 'text-[hsl(38_90%_35%)]' : ''
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
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
            {EXPENSE_CATEGORIES.map(
              (item: ExpenseCategory): React.ReactNode => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={approvalStatus}
          onValueChange={(value: string) => {
            setApprovalStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部状态</SelectItem>
            {EXPENSE_APPROVAL_STATUSES.map(
              (item: ExpenseApprovalStatus): React.ReactNode => (
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
          scroll={{ x: 1500, y: 500 }}
          locale={{ emptyText: '暂无费用记录' }}
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

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={formInitial}
        onSaved={() => void loadList()}
      />

      <ExpenseDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <ExpenseApproveDialog
        item={approveItem}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onDone={() => void loadList()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除费用？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `将删除费用单 ${deleteTarget.expenseNo}（${deleteTarget.category}，${formatMoney(deleteTarget.amount)}），删除后不可恢复。`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesPage;
