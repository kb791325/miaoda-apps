import { useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedAmount } from '@/components/ProtectedField';
import { formatAmount } from '@/lib/format';
import { useFieldPermission } from '@/hooks/useFieldPermission';
import { useServerList } from '@/hooks/useServerList';
import { salariesApi } from '@/api';

const STATUS_OPTS = [
  { label: '已发放', value: '已发放' },
  { label: '待发放', value: '待发放' },
];
const FILTERS: FilterField[] = [
  { key: 'emp_name', label: '员工姓名', type: 'input', placeholder: '员工姓名' },
  { key: 'department', label: '部门', type: 'input', placeholder: '部门' },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];
type SalaryRecord = {
  id: string | number;
  salary_no: string;
  emp_name: string;
  department: string;
  base_salary: number;
  commission: number;
  perf_salary: number;
  subsidy: number;
  deduction: number;
  gross_salary: number;
  social_deduction: number;
  fund: number;
  tax: number;
  actual_salary: number;
  salary_month: string;
  status: string;
};

function AmountCell({ value, className }: { value: number | undefined; className?: string }) {
  return <span className={`tabular-nums ${className ?? ''}`}>{formatAmount(value ?? 0)}</span>;
}

function NegativeAmountCell({ value }: { value: number | undefined }) {
  const v = value ?? 0;
  return <span className="tabular-nums text-red-600">{v === 0 ? '¥0.00' : `-${formatAmount(Math.abs(v))}`}</span>;
}
export default function SalaryPage() {
  const { isVisible } = useFieldPermission();
  const table = useServerList({
    fetchFn: salariesApi.list,
    defaultPageSize: 20,
  });
  const columns: Column<SalaryRecord>[] = useMemo(() => {
    const base: Column<SalaryRecord>[] = [
      { key: 'salary_no', title: '工资编号', dataIndex: 'salary_no' as const, width: '150px', sortable: true },
      { key: 'emp_name', title: '员工姓名', dataIndex: 'emp_name' as const, width: '100px' },
      { key: 'department', title: '部门', dataIndex: 'department' as const, width: '120px' },
    ];
    if (isVisible('hr.salary_base')) {
      base.push({
        key: 'base_salary',
        title: '基本工资',
        width: '120px',
        align: 'right',
        sortable: true,
        render: (r) => (
          <ProtectedAmount fieldKey="hr.salary_base" value={r.base_salary} />
        ),
      });
    }
    if (isVisible('hr.salary_performance')) {
      base.push(
        {
          key: 'commission',
          title: '提成',
          width: '100px',
          align: 'right',
          render: (r) => <AmountCell value={r.commission} />,
        },
        {
          key: 'perf_salary',
          title: '绩效工资',
          width: '120px',
          align: 'right',
          render: (r) => (
            <ProtectedAmount fieldKey="hr.salary_performance" value={r.perf_salary} />
          ),
        },
      );
    }
    if (isVisible('hr.salary_allowance')) {
      base.push({
        key: 'subsidy',
        title: '补贴',
        width: '100px',
        align: 'right',
        render: (r) => (
          <ProtectedAmount fieldKey="hr.salary_allowance" value={r.subsidy} />
        ),
      });
    }
    if (isVisible('hr.salary_deduction')) {
      base.push({
        key: 'deduction',
        title: '扣款',
        width: '100px',
        align: 'right',
        render: (r) => (
          <ProtectedAmount fieldKey="hr.salary_deduction" value={r.deduction} />
        ),
      });
    }
    if (isVisible('hr.salary_net')) {
      base.push(
        {
          key: 'gross_salary',
          title: '应发工资',
          width: '120px',
          align: 'right',
          render: (r) => <AmountCell value={r.gross_salary} />,
        },
        {
          key: 'social_deduction',
          title: '社保扣款',
          width: '110px',
          align: 'right',
          render: (r) => <NegativeAmountCell value={r.social_deduction} />,
        },
        {
          key: 'fund',
          title: '公积金',
          width: '100px',
          align: 'right',
          render: (r) => <NegativeAmountCell value={r.fund} />,
        },
        {
          key: 'tax',
          title: '个税',
          width: '100px',
          align: 'right',
          render: (r) => <NegativeAmountCell value={r.tax} />,
        },
        {
          key: 'actual_salary',
          title: '实发工资',
          width: '130px',
          align: 'right',
          sortable: true,
          render: (r) => (
            <ProtectedAmount fieldKey="hr.salary_net" value={r.actual_salary} className="font-semibold text-primary" />
          ),
        },
      );
    }
    base.push(
      { key: 'salary_month', title: '薪资月份', dataIndex: 'salary_month' as const, width: '100px' },
      {
        key: 'status',
        title: '状态',
        width: '90px',
        render: (r) => (
          <StatusBadge
            status={r.status}
            variant={r.status === '已发放' ? 'success' : 'warning'}
          />
        ),
      },
    );
    return base;
  }, [isVisible]);
  return (
    <ServerListPage<SalaryRecord>
      title={t('工资管理')}
      description="管理员工工资条数据"
      data={table.data as SalaryRecord[]}
      total={table.total}
      loading={table.loading}
      columns={columns}
      filters={FILTERS}
      selectable={false}
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      onSearch={table.setFilters}
      onReset={table.handleReset}
      onSort={table.handleSort}
      sortBy={table.sortBy}
      sortOrder={table.sortOrder}
      onRefresh={table.refresh}
    />
  );
}
