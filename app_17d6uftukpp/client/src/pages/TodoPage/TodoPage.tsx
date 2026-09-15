import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Clock, AlertTriangle, ArrowRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { loadModuleRecords } from '@/lib/data-service';
import { fetchPendingApprovals, type IApprovalRecord } from '@/lib/approval';
import type { IBizRecord, ModuleKey } from '@/data/mt-records';
import { useNavigate } from 'react-router-dom';

interface ITodoItem {
  id: string;
  type: 'task' | 'approval' | 'expiring' | 'overdue';
  module: string;
  title: string;
  description: string;
  priority: 'high' | 'mid' | 'low';
  link?: string;
  timestamp: string;
}

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  account_open: '开户审批',
  contract: '合同审批',
  purchase: '采购审批',
  refund: '退款审批',
  transfer: '转户审批',
  commission: '提成审批',
  other: '其他审批',
};

const PRIORITY_BADGE: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' }> = {
  high: { label: '高', variant: 'destructive' },
  mid: { label: '中', variant: 'default' },
  low: { label: '低', variant: 'secondary' },
};

const TYPE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  task: { label: '任务', variant: 'default' },
  approval: { label: '审批', variant: 'secondary' },
  expiring: { label: '即将到期', variant: 'destructive' },
  overdue: { label: '已逾期', variant: 'destructive' },
};

export default function TodoPage() {
  const [todos, setTodos] = useState<ITodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      try {
        const items: ITodoItem[] = [];
        const now = new Date();
        const nowStr = now.toISOString().slice(0, 10);

        // 1. 任务模块 - 待处理/进行中的任务
        try {
          const tasks = await loadModuleRecords('task', true);
          const pendingTasks = tasks.filter((t) => {
            const status = String(t.values.status ?? '');
            return status !== '已完成' && status !== '已取消';
          });
          for (const t of pendingTasks) {
            const priority = String(t.values.priority ?? '中');
            const dueDate = String(t.values.dueDate ?? '');
            const isOverdue = dueDate && dueDate < nowStr;
            items.push({
              id: t.recordId,
              type: isOverdue ? 'overdue' : 'task',
              module: '任务中心',
              title: String(t.values.title ?? '未命名任务'),
              description: `负责人: ${t.values.assignee ?? '-'} | 截止: ${dueDate || '未设置'}`,
              priority: (priority === '高' || priority === 'high') ? 'high' : (priority === '低' || priority === 'low') ? 'low' : 'mid',
              link: `/tasks/${t.recordId}`,
              timestamp: t.updatedAt ?? t.createdAt ?? '',
            });
          }
        } catch { /* 模块不可用则跳过 */ }

        // 2. 合同模块 - 即将到期/已到期合同
        try {
          const contracts = await loadModuleRecords('contract', true);
          const activeContracts = contracts.filter((c) => {
            const status = String(c.values.status ?? '');
            return status === '生效' || status === 'active';
          });
          for (const c of activeContracts) {
            const expireDate = String(c.values.expireDate ?? '');
            if (!expireDate) continue;
            const expire = new Date(expireDate);
            const diffDays = Math.ceil((expire.getTime() - now.getTime()) / 86400000);
            if (diffDays <= 30 && diffDays > 0) {
              items.push({
                id: c.recordId,
                type: 'expiring',
                module: '合同业务',
                title: `合同即将到期: ${String(c.values.title ?? c.values.code ?? '')}`,
                description: `到期日: ${expireDate} | 剩余 ${diffDays} 天`,
                priority: diffDays <= 7 ? 'high' : 'mid',
                link: `/contracts/${c.recordId}`,
                timestamp: expireDate,
              });
            } else if (diffDays <= 0) {
              items.push({
                id: c.recordId,
                type: 'overdue',
                module: '合同业务',
                title: `合同已到期: ${String(c.values.title ?? c.values.code ?? '')}`,
                description: `到期日: ${expireDate}`,
                priority: 'high',
                link: `/contracts/${c.recordId}`,
                timestamp: expireDate,
              });
            }
          }
        } catch { /* 跳过 */ }

        // 3. 审批流 - 待审批
        try {
          const pendingApprovals = fetchPendingApprovals();
          for (const a of pendingApprovals) {
            items.push({
              id: a.recordId,
              type: 'approval',
              module: '审批中心',
              title: `${APPROVAL_TYPE_LABELS[a.approvalType] ?? '审批'}: ${a.title}`,
              description: `发起人: ${a.submitter} | 当前节点: ${a.nodes.find((n) => n.step === a.currentNode)?.name ?? '-'}`,
              priority: 'high',
              link: '/approval',
              timestamp: a.createdAt,
            });
          }
        } catch { /* 跳过 */ }

        // 4. 客户跟进 - 超过7天未跟进
        try {
          const customers = await loadModuleRecords('customer', true);
          const staleCustomers = customers.filter((c) => {
            const lastFollow = String(c.values.lastFollowUp ?? '');
            if (!lastFollow) return false;
            const diff = (now.getTime() - new Date(lastFollow).getTime()) / 86400000;
            return diff > 7;
          });
          for (const c of staleCustomers.slice(0, 5)) {
            items.push({
              id: c.recordId,
              type: 'overdue',
              module: '客户管理',
              title: `客户超7天未跟进: ${String(c.values.name ?? c.values.title ?? '')}`,
              description: `最后跟进: ${c.values.lastFollowUp ?? '未知'}`,
              priority: 'mid',
              link: `/customers/${c.recordId}`,
              timestamp: c.values.lastFollowUp as string ?? '',
            });
          }
        } catch { /* 跳过 */ }

        if (alive) setTodos(items);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let result = todos;
    if (activeTab !== 'all') result = result.filter((t) => t.type === activeTab);
    if (search) result = result.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
    // 按优先级和时间排序
    result = [...result].sort((a, b) => {
      const pOrder = { high: 0, mid: 1, low: 2 };
      const pd = pOrder[a.priority] - pOrder[b.priority];
      if (pd !== 0) return pd;
      return b.timestamp.localeCompare(a.timestamp);
    });
    return result;
  }, [todos, activeTab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: todos.length };
    for (const t of todos) c[t.type] = (c[t.type] ?? 0) + 1;
    return c;
  }, [todos]);

  const handleClick = (item: ITodoItem) => {
    if (item.link) navigate(item.link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">我的待办</h2>
        <p className="mt-1 text-sm text-muted-foreground">跨模块聚合待处理任务、审批、到期提醒</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { key: 'all', label: '全部待办', icon: CheckSquare, color: 'text-primary' },
          { key: 'task', label: '任务', icon: Clock, color: 'text-info' },
          { key: 'approval', label: '审批', icon: CheckSquare, color: 'text-warning' },
          { key: 'overdue', label: '已逾期', icon: AlertTriangle, color: 'text-destructive' },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="cursor-pointer" onClick={() => setActiveTab(key)}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={`size-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{counts[key] ?? 0}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索与筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索待办事项"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="task">任务</TabsTrigger>
                <TabsTrigger value="approval">审批</TabsTrigger>
                <TabsTrigger value="expiring">即将到期</TabsTrigger>
                <TabsTrigger value="overdue">已逾期</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* 待办列表 */}
      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">加载中...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">🎉 暂无待办事项，工作已全部完成</CardContent></Card>
        ) : (
          filtered.map((item) => {
            const typeBadge = TYPE_BADGE[item.type];
            const priorityBadge = PRIORITY_BADGE[item.priority];
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => handleClick(item)}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      <Badge variant="outline">{item.module}</Badge>
                      <Badge variant={priorityBadge.variant}>{priorityBadge.label}</Badge>
                    </div>
                    <h4 className="font-medium truncate">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}