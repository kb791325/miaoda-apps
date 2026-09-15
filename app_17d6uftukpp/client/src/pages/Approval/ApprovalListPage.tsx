import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Check, X, Search, RefreshCw, ChevronRight } from 'lucide-react';
import {
  fetchAllApprovals,
  approveRecord,
  rejectRecord,
  getApprovalDetailUrl,
  ApprovalActionError,
  type ApprovalItem,
  type ApprovalFetchResult,
} from '@/lib/approval-cross-table';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: '待审批', label: '待审批' },
  { value: '审批中', label: '审批中' },
];

export default function ApprovalListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedTables, setFailedTables] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setFailedTables([]);
    try {
      const result: ApprovalFetchResult = await fetchAllApprovals();
      setItems(result.items);
      if (result.failedTables.length > 0) {
        setFailedTables(result.failedTables);
      }
    } catch {
      setError('加载审批数据失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (item: ApprovalItem) => {
    const key = `${item.config.moduleKey}:${item.recordId}`;
    setActingIds((prev) => new Set(prev).add(key));
    try {
      await approveRecord(item);
      toast.success(`${item.typeLabel} ${item.title} 已通过`);
      setItems((prev) => prev.filter((i) => i.recordId !== item.recordId || i.config.moduleKey !== item.config.moduleKey));
    } catch (e) {
      toast.error(e instanceof ApprovalActionError ? e.message : '操作失败，请重试');
    } finally {
      setActingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleReject = async (item: ApprovalItem) => {
    const key = `${item.config.moduleKey}:${item.recordId}`;
    setActingIds((prev) => new Set(prev).add(key));
    try {
      await rejectRecord(item);
      toast.success(`${item.typeLabel} ${item.title} 已驳回`);
      setItems((prev) => prev.filter((i) => i.recordId !== item.recordId || i.config.moduleKey !== item.config.moduleKey));
    } catch (e) {
      toast.error(e instanceof ApprovalActionError ? e.message : '操作失败，请重试');
    } finally {
      setActingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const typeOptions = Array.from(new Set(items.map((i) => i.typeLabel))).sort();

  const filtered = items.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (typeFilter !== 'all' && i.typeLabel !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.typeLabel.toLowerCase().includes(q) && !i.submitter.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleDetail = (item: ApprovalItem) => {
    const url = getApprovalDetailUrl(item.config, item.recordId);
    navigate(url);
  };

  const statusBadge = (status: string) => {
    if (status === '待审批') return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">待审批</Badge>;
    if (status === '审批中') return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">审批中</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">审批中心</h2>
          <p className="text-sm text-muted-foreground mt-1">
            待审批 {items.length} 条
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索标题/类型/发起人"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {typeOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={load}>重试</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {items.length === 0 ? '暂无审批记录' : '没有匹配的审批记录'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {failedTables.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-3 text-sm text-amber-700">
                以下表加载失败：{failedTables.join('、')}。
                <Button variant="ghost" size="sm" className="text-amber-700 underline ml-2 p-0 h-auto" onClick={load}>重试</Button>
              </CardContent>
            </Card>
          )}
          {filtered.map((item) => {
            const actingKey = `${item.config.moduleKey}:${item.recordId}`;
            return (
              <Card key={actingKey} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        className="text-left font-medium text-primary hover:underline truncate block max-w-full"
                        onClick={() => handleDetail(item)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {item.title}
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        </span>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-normal">{item.typeLabel}</Badge>
                        <span>{item.submitter}</span>
                        <span>·</span>
                        <span>{item.time}</span>
                        {statusBadge(item.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleApprove(item)}
                        disabled={actingIds.has(actingKey)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {actingIds.has(actingKey) ? '处理中' : '通过'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleReject(item)}
                        disabled={actingIds.has(actingKey)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {actingIds.has(actingKey) ? '处理中' : '驳回'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}