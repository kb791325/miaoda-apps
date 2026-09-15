import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { RefreshCw, Trash2, Undo2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { invalidLeadsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
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
import { exportCSV } from '@/lib/export';

const TIER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'A级', value: 'A' },
  { label: 'B级', value: 'B' },
  { label: 'C级', value: 'C' },
  { label: 'D级', value: 'D' },
];

const INDUSTRY_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '电商', value: '电商' },
  { label: '教育', value: '教育' },
  { label: '游戏', value: '游戏' },
  { label: '金融', value: '金融' },
  { label: '本地生活', value: '本地生活' },
  { label: '家居', value: '家居' },
  { label: '美妆', value: '美妆' },
];

const REASON_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '电话空号', value: '电话空号' },
  { label: '客户无投放意向', value: '客户无投放意向' },
  { label: '资料不完整', value: '资料不完整' },
  { label: '客户已停业', value: '客户已停业' },
  { label: '重复客资', value: '重复客资' },
];

const FILTER_FIELDS: FilterField[] = [
  { key: 'keyword', label: '主体名称', type: 'input', placeholder: '请输入主体名称' },
  { key: 'lead_level', label: '客资分层', type: 'select', options: TIER_OPTIONS },
  { key: 'primary_industry', label: '一级行业', type: 'select', options: INDUSTRY_OPTIONS },
  { key: 'invalid_reason', label: '无效原因', type: 'select', options: REASON_OPTIONS, advanced: true },
  { key: 'date_range', label: '标记时间', type: 'date-range', advanced: true },
];

export default function InvalidLeadsPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const table = useServerList({
    fetchFn: invalidLeadsApi.list,
    defaultPageSize: 20,
  });

  const selectedNum = selectedKeys.length;
  const selectedIds = selectedKeys.map(Number);

  const columns: Column<any>[] = useMemo(() => [
    { key: 'lead_no', title: '客资编号', width: '110px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.lead_no}</span> },
    {
      key: 'entity_name',
      title: '主体名称',
      dataIndex: 'entity_name' as any,
      sortable: true,
      render: (r) => <span className="font-medium">{r.entity_name}</span>,
    },
    {
      key: 'lead_level',
      title: '客资分层',
      width: '90px',
      render: (r) => <StatusBadge status={r.lead_level} variant="info" />,
    },
    { key: 'primary_industry', title: '一级行业', width: '100px', dataIndex: 'primary_industry' as any },
    { key: 'secondary_industry', title: '二级行业', width: '120px', dataIndex: 'secondary_industry' as any },
    {
      key: 'invalid_reason',
      title: '无效原因',
      width: '140px',
      render: (r) => (
        <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
          {r.invalid_reason}
        </span>
      ),
    },
    { key: 'creator_name', title: '创建人', width: '90px', dataIndex: 'creator_name' as any },
    {
      key: 'invalid_at',
      title: '标记无效时间',
      dataIndex: 'invalid_at' as any,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.invalid_at),
    },
  ], []);

  const handleRestore = async () => {
    if (!restoreId) return;
    try {
      const res = await invalidLeadsApi.restore(restoreId);
      if (res.code === 0) {
        toast.success('已恢复到公海客资池');
        setRestoreId(null);
        table.refresh();
      } else {
        toast.error(res.message || '恢复失败');
      }
    } catch (e) {
      toast.error('恢复失败');
    }
  };

  const handleBatchRestore = async () => {
    setBatchRestoreOpen(false);
    try {
      const res = await invalidLeadsApi.batchRestore(selectedIds);
      if (res.code === 0) {
        toast.success(`已恢复 ${selectedNum} 条到公海`);
        setSelectedKeys([]);
        table.refresh();
      } else {
        toast.error(res.message || '恢复失败');
      }
    } catch (e) {
      toast.error('批量恢复失败');
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleteOpen(false);
    try {
      const res = await invalidLeadsApi.batchDelete(selectedIds);
      if (res.code === 0) {
        toast.success(`成功删除 ${selectedNum} 条`);
        setSelectedKeys([]);
        table.refresh();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch (e) {
      toast.error('批量删除失败');
    }
  };

  const handleExport = () => {
    const rows = (table.data as any[]).map(r => [
      r.entity_name, r.lead_level, r.primary_industry, r.secondary_industry,
      r.invalid_reason, r.creator_name, r.invalid_at, r.pool_time,
    ]);
    exportCSV(
      '无效客资导出',
      ['主体名称', '分层', '一级行业', '二级行业', '无效原因', '标记人', '标记时间', '调入时间'],
      rows,
    );
    toast.success('导出成功');
  };

  const primaryActions: ActionButton[] = [
    { label: '批量恢复', icon: <Undo2 className="size-3.5" />, onClick: () => {
      if (selectedNum === 0) { toast.warning('请先选择客资'); return; }
      setBatchRestoreOpen(true);
    }},
    { label: '批量删除', variant: 'outline', icon: <Trash2 className="size-3.5" />, onClick: () => {
      if (selectedNum === 0) { toast.warning('请先选择客资'); return; }
      setBatchDeleteOpen(true);
    }},
    { label: '导出', icon: <Download className="size-3.5" />, onClick: handleExport },
    { label: '刷新', variant: 'ghost', icon: <RefreshCw className="size-3.5" />, onClick: () => table.refresh() },
  ];

  const rowActions = (record: any): ActionButton[] => [
    { label: '恢复', onClick: () => setRestoreId(record.id) },
    { label: '删除', variant: 'destructive', onClick: () => {
      setSelectedKeys([String(record.id)]);
      setBatchDeleteOpen(true);
    }},
  ];

  return (
    <>
      <ServerListPage<any>
        title={t('无效客资')}
        description="已标记为无效的客资，可恢复到公海或永久删除"
        data={table.data as any[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTER_FIELDS}
        primaryActions={primaryActions}
        selectable
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
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
        emptyText="暂无无效客资"
      />

      {/* 单条恢复确认 */}
      <AlertDialog open={restoreId !== null} onOpenChange={(o) => !o && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复</AlertDialogTitle>
            <AlertDialogDescription>
              恢复后该客资将回到公海客资池，状态为「待分配」，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>确认恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量恢复确认 */}
      <AlertDialog open={batchRestoreOpen} onOpenChange={setBatchRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量恢复客资</AlertDialogTitle>
            <AlertDialogDescription>
              确定将选中的 <span className="font-semibold text-primary">{selectedNum}</span> 条客资恢复到公海客资池吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchRestore}>确认恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">危险操作：批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定永久删除选中的 <span className="font-semibold text-destructive">{selectedNum}</span> 条无效客资吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBatchDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
