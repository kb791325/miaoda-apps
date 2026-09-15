import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Search, Eye, Trash2, RotateCcw } from 'lucide-react';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import PaginationFooter from '@client/src/components/ui/pagination-footer';
import { usePagination } from '@client/src/hooks/usePagination';
import { cn } from '@client/src/lib/utils';

import { list, remove } from '@client/src/api/work-orders';
import type { WorkOrderItem, WorkOrderStatus, WorkOrderUrgency, WorkOrderProblemType } from '@shared/api.interface';
import CreateWorkOrderDialog from './CreateWorkOrderDialog';
import WorkOrderDetailPanel from './WorkOrderDetailPanel';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'waiting_confirm', label: '待确认' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];
const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部紧急程度' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];
const PTYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'hardware', label: '硬件故障' },
  { value: 'software', label: '软件问题' },
  { value: 'network', label: '网络问题' },
  { value: 'account', label: '账号问题' },
  { value: 'peripheral', label: '外设问题' },
  { value: 'other', label: '其他' },
];
const STATUS_LABEL: Record<string, string> = {
  pending: '待处理', processing: '处理中', waiting_confirm: '待确认',
  resolved: '已解决', closed: '已关闭',
};
const STATUS_STYLE: Record<string, string> = {
  pending: 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]',
  processing: 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]',
  waiting_confirm: 'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]',
  resolved: 'border-[hsl(142_60%_45%)] bg-[hsl(142_60%_95%)] text-[hsl(142_60%_30%)]',
  closed: 'border-border bg-muted text-muted-foreground',
};
const URGENCY_LABEL: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' };
const URGENCY_STYLE: Record<string, string> = {
  low: 'border-border bg-muted text-muted-foreground',
  medium: 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]',
  high: 'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]',
  urgent: 'border-[hsl(0_70%_55%)] bg-[hsl(0_70%_95%)] text-[hsl(0_70%_40%)]',
};
const PTYPE_LABEL: Record<string, string> = {
  hardware: '硬件故障', software: '软件问题', network: '网络问题',
  account: '账号问题', peripheral: '外设问题', other: '其他',
};

const WorkOrdersPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [problemType, setProblemType] = useState('');
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterVersion, setFilterVersion] = useState(0);
  const pagination = usePagination({ initialPage: 1, initialPageSize: 20 });
  const { page, pageSize, totalPages } = pagination;
  const { setTotal } = pagination;
  const debounceRef = useRef<number | undefined>(undefined);
  const fetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const buildParams = useCallback(() => ({
    keyword: keyword || undefined,
    status: status || undefined,
    urgency: urgency || undefined,
    problem_type: problemType || undefined,
  }), [keyword, status, urgency, problemType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await list({ ...buildParams(), page, pageSize });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('加载工单列表失败', err);
      toast.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, buildParams, setTotal]);

  fetchRef.current = fetchData;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pagination.resetPage();
      setFilterVersion((v) => v + 1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, status, urgency, problemType]);

  useEffect(() => { fetchData(); }, [page, pageSize, filterVersion]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchData]);

  const handleReset = () => {
    setKeyword(''); setStatus(''); setUrgency(''); setProblemType('');
    pagination.resetPage();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('工单已删除');
      fetchData();
    } catch (err: unknown) {
      logger.error('删除工单失败', err);
      toast.error('删除失败');
    }
  };

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const columns: TableProps<WorkOrderItem>['columns'] = [
    {
      title: '工单号', dataIndex: 'orderNo', width: 200,
      render: (v: string) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      title: '问题类型', dataIndex: 'problemType', width: 100,
      render: (v: WorkOrderProblemType) => PTYPE_LABEL[v] || v,
    },
    {
      title: '紧急程度', dataIndex: 'urgency', width: 90,
      render: (v: WorkOrderUrgency) => (
        <Badge className={cn('rounded-sm font-medium border px-2 py-0.5 text-xs', URGENCY_STYLE[v] || '')} variant="outline">
          {URGENCY_LABEL[v] || v}
        </Badge>
      ),
    },
    {
      title: '描述', dataIndex: 'description', width: 200, ellipsis: true,
      render: (v: string) => <span className="text-sm">{v}</span>,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: WorkOrderStatus) => (
        <Badge className={cn('rounded-sm font-medium border px-2 py-0.5 text-xs', STATUS_STYLE[v] || '')} variant="outline">
          {STATUS_LABEL[v] || v}
        </Badge>
      ),
    },
    {
      title: '报修人', dataIndex: 'reporterName', width: 100,
      render: (v: string, r: WorkOrderItem) => v || r.reporter,
    },
    {
      title: '处理人', dataIndex: 'assigneeName', width: 100,
      render: (v: string, r: WorkOrderItem) => v || r.assignee || '-',
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 160,
      render: (v: string) => <span className="font-mono text-sm">{v ? v.slice(0, 19).replace('T', ' ') : '-'}</span>,
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 140,
      render: (_: unknown, r: WorkOrderItem) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleView(r.id)}>
            <Eye className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">IT 报修工单</h1>
        <CreateWorkOrderDialog onCreated={fetchData} />
      </div>

      <Card className="rounded-sm border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">关键字搜索</label>
              <Input
                placeholder="工单号 / 描述 / 资产名称 / 联系电话"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">状态</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="全部状态" /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">紧急程度</label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>{URGENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">问题类型</label>
              <Select value={problemType} onValueChange={setProblemType}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>{PTYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-4 mr-1" />重置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border">
        <CardContent className="p-0">
          <Table
            columns={columns}
            dataSource={items}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200, y: 500 }}
            pagination={false}
            rowClassName={() => 'h-10'}
          />
          <PaginationFooter
            total={pagination.total}
            page={page}
            totalPages={totalPages}
            onPageChange={pagination.setPage}
          />
        </CardContent>
      </Card>

      <WorkOrderDetailPanel
        orderId={detailId}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailId(null); }}
        onUpdated={fetchData}
      />
    </div>
  );
};

export default WorkOrdersPage;