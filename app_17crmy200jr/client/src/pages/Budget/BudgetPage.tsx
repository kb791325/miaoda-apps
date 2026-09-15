import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  RefreshCw,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  History,
  PlusCircle,
  MinusCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Progress } from '@client/src/components/ui/progress';
import { Badge } from '@client/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type {
  Budget,
  BudgetAdjustment,
  BudgetExecutionItem,
  BudgetExecutionResponse,
} from '@shared/api.interface';
import * as budgetApi from '@client/src/api/budget';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { formatAmount } from '@client/src/utils/format';
import BudgetFormDialog from './BudgetFormDialog';

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}月`,
}));

const getProgressColor = (rate: number): string => {
  if (rate > 100) return 'bg-destructive';
  if (rate >= 80) return 'bg-warning';
  return 'bg-success';
};

const getStatusBadge = (status: 'normal' | 'warning' | 'overrun') => {
  if (status === 'overrun') {
    return (
      <Badge
        variant="outline"
        className="border-destructive/50 bg-destructive/10 text-destructive"
      >
        超预算
      </Badge>
    );
  }
  if (status === 'warning') {
    return (
      <Badge
        variant="outline"
        className="border-warning/50 bg-warning/10 text-warning"
      >
        预警
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-success/50 bg-success/10 text-success"
    >
      正常
    </Badge>
  );
};

const BudgetPage = () => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [listData, setListData] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [execution, setExecution] = useState<BudgetExecutionResponse | null>(
    null,
  );
  const [execLoading, setExecLoading] = useState(false);

  // 新增/编辑弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);

  // 调整历史弹窗
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBudgetId, setHistoryBudgetId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<BudgetAdjustment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 批量设置弹窗
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<
    { department: string; budgetAmount: string }[]
  >([{ department: '', budgetAmount: '' }]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // 加载执行概览
  const fetchExecution = useCallback(() => {
    setExecLoading(true);
    budgetApi
      .getBudgetExecution({ year, month })
      .then((data) => setExecution(data))
      .catch((err: unknown) => {
        logger.error('加载预算执行概览失败', err);
      })
      .finally(() => setExecLoading(false));
  }, [year, month]);

  // 加载列表
  const fetchList = useCallback(() => {
    setLoading(true);
    budgetApi
      .getBudgetList({
        year,
        month,
        department: department || undefined,
        page,
        pageSize,
      })
      .then((data) => {
        setListData(data.items);
        setTotal(data.total);
      })
      .catch((err: unknown) => {
        logger.error('加载预算列表失败', err);
        toast.error('加载失败');
      })
      .finally(() => setLoading(false));
  }, [year, month, department, page, pageSize]);

  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSearch = () => {
    setPage(1);
    fetchList();
  };

  const handleReset = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(String(now.getMonth() + 1));
    setDepartment('');
    setPage(1);
    fetchList();
    fetchExecution();
  };

  const handleAdd = () => {
    setEditBudget(null);
    setFormOpen(true);
  };

  const handleEdit = (item: Budget) => {
    setEditBudget(item);
    setFormOpen(true);
  };

  const handleHistory = async (item: Budget) => {
    setHistoryBudgetId(item.id);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await budgetApi.getBudgetAdjustments(item.id);
      setHistoryList(data);
    } catch (err) {
      logger.error('加载调整历史失败', err);
      toast.error('加载调整历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定删除该预算记录？删除后不可恢复。')) return;
    try {
      await budgetApi.deleteBudget(id);
      toast.success('删除成功');
      fetchList();
      fetchExecution();
    } catch (err) {
      logger.error('删除失败', err);
      toast.error('删除失败');
    }
  };

  const handleFormSaved = () => {
    fetchList();
    fetchExecution();
  };

  // 预算记录 Map 索引（部门+年份+月份 → 预算记录），避免渲染循环内 O(n) find
  const budgetMap = useMemo(() => {
    const map = new Map<string, Budget>();
    for (const b of listData) {
      map.set(`${b.department}-${b.budgetYear}-${b.budgetMonth}`, b);
    }
    return map;
  }, [listData]);

  // 批量设置
  const handleBatchOpen = () => {
    setBatchItems([{ department: '', budgetAmount: '' }]);
    setBatchOpen(true);
  };

  const handleBatchAddRow = () => {
    setBatchItems([...batchItems, { department: '', budgetAmount: '' }]);
  };

  const handleBatchRemoveRow = (index: number) => {
    if (batchItems.length <= 1) return;
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const handleBatchRowChange = (
    index: number,
    field: 'department' | 'budgetAmount',
    value: string,
  ) => {
    const next = [...batchItems];
    next[index][field] = value;
    setBatchItems(next);
  };

  const handleBatchSubmit = async () => {
    const validItems = batchItems.filter(
      (item) => item.department.trim() && Number(item.budgetAmount) > 0,
    );
    if (validItems.length === 0) {
      if (batchItems.some((item) => Number(item.budgetAmount) <= 0 && item.budgetAmount !== '')) {
        toast.error('预算金额必须大于 0');
      } else {
        toast.error('请至少填写一条有效数据');
      }
      return;
    }

    setBatchSubmitting(true);
    try {
      const result = await budgetApi.batchCreateBudget({
        items: validItems.map((item) => ({
          department: item.department.trim(),
          budgetAmount: Number(item.budgetAmount),
        })),
        year,
        month,
      });
      toast.success(`批量设置成功，共 ${result.successCount} 条`);
      setBatchOpen(false);
      fetchList();
      fetchExecution();
    } catch (err) {
      logger.error('批量设置失败', err);
      toast.error('批量设置失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const execItems = execution?.items ?? [];

  // 执行数据按部门建立索引，用于匹配预算列表每行
  const execMap = useMemo(() => {
    const map = new Map<string, BudgetExecutionItem>();
    for (const it of execItems) {
      map.set(it.department, it);
    }
    return map;
  }, [execItems]);

  const statCards = useMemo(() => {
    const totalBudget = execution?.totalBudget ?? 0;
    const totalUsed = execution?.totalUsed ?? 0;
    const remaining = Math.max(0, totalBudget - totalUsed);
    const rate = execution?.overallExecutionRate ?? 0;
    return [
      {
        label: '总预算金额',
        value: `¥${formatAmount(totalBudget)}`,
        icon: Wallet,
        accent: 'text-primary',
      },
      {
        label: '已用金额',
        value: `¥${formatAmount(totalUsed)}`,
        icon: TrendingUp,
        accent: 'text-primary',
      },
      {
        label: '剩余金额',
        value: `¥${formatAmount(remaining)}`,
        icon: CheckCircle,
        accent: rate > 100 ? 'text-destructive' : 'text-success',
      },
      {
        label: '整体执行率',
        value: `${rate.toFixed(2)}%`,
        icon: AlertTriangle,
        accent: rate > 100 ? 'text-destructive' : rate >= 80 ? 'text-warning' : 'text-success',
      },
    ];
  }, [execution]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold mb-6">预算管理</h1>

      {/* 统计卡片 */}
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        data-ai-section-type="card-stat"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-sm border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
              <div
                className={`mt-2 font-mono text-2xl font-semibold text-right ${card.accent}`}
              >
                {execLoading ? '—' : card.value}
              </div>
              {card.label === '整体执行率' && (
                <div className="mt-2">
                  <Progress
                    value={Math.min(100, execution?.overallExecutionRate ?? 0)}
                    className={getProgressColor(
                      execution?.overallExecutionRate ?? 0,
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 筛选栏 */}
      <div className="rounded-sm border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-32 flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              年份
            </label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="font-mono"
            />
          </div>
          <div className="flex w-32 flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              月份
            </label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="选择月份" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              部门搜索
            </label>
            <Input
              placeholder="输入部门名称"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              查询
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handleBatchOpen}>
              <PlusCircle className="mr-2 h-4 w-4" />
              批量设置
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              新增预算
            </Button>
          </div>
        </div>
      </div>

      {/* 预算执行表格 */}
      <div className="rounded-sm border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            部门预算执行情况
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="h-10">
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  部门
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  预算金额
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  已用金额
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  剩余金额
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  执行率
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  状态
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    加载中...
                  </TableCell>
                </TableRow>
               ) : listData.length === 0 ? (
                 <TableRow>
                   <TableCell
                     colSpan={7}
                     className="text-center py-8 text-muted-foreground"
                   >
                     暂无数据
                   </TableCell>
                 </TableRow>
               ) : (
                 listData.map((item: Budget) => {
                   const exec = execMap.get(item.department);
                   const usedAmount = exec?.usedAmount ?? 0;
                   const remainingAmount = item.budgetAmount - usedAmount;
                   const executionRate = item.budgetAmount > 0
                     ? (usedAmount / item.budgetAmount) * 100
                     : 0;
                   const status: 'normal' | 'warning' | 'overrun' =
                     executionRate > 100
                       ? 'overrun'
                       : executionRate >= 80
                         ? 'warning'
                         : 'normal';
                   return (
                     <TableRow key={item.id} className="h-10">
                       <TableCell className="font-medium">
                         {item.department}
                       </TableCell>
                       <TableCell className="text-right font-mono">
                         ¥{formatAmount(item.budgetAmount)}
                       </TableCell>
                       <TableCell className="text-right font-mono">
                         ¥{formatAmount(usedAmount)}
                       </TableCell>
                       <TableCell className="text-right font-mono">
                         ¥{formatAmount(remainingAmount)}
                       </TableCell>
                       <TableCell className="min-w-[180px]">
                         <div className="flex items-center gap-2">
                           <div className="flex-1">
                             <Progress
                               value={Math.min(100, executionRate)}
                               className={getProgressColor(executionRate)}
                             />
                           </div>
                           <span
                             className={`w-16 text-right font-mono text-xs ${
                               executionRate > 100
                                 ? 'text-destructive'
                                 : executionRate >= 80
                                   ? 'text-warning'
                                   : 'text-success'
                             }`}
                           >
                             {executionRate.toFixed(2)}%
                           </span>
                         </div>
                       </TableCell>
                       <TableCell>{getStatusBadge(status)}</TableCell>
                       <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             className="h-7 px-2 text-xs"
                             onClick={() => handleEdit(item)}
                           >
                             编辑
                           </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleHistory(item)}
                            >
                              <History className="mr-1 h-3.5 w-3.5" />
                              历史
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              删除
                            </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   );
                 })
               )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground">
              共 {total} 条
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                上一页
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editBudget={editBudget}
        year={year}
        month={month}
        onSaved={handleFormSaved}
      />

      {/* 调整历史弹窗 */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="rounded-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>预算调整历史</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                加载中...
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                暂无调整记录
              </div>
            ) : (
              <div className="relative">
                {/* 时间线 */}
                <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4">
                  {historyList.map((item: BudgetAdjustment) => (
                    <div key={item.id} className="relative pl-10">
                      {/* 时间点 */}
                      <div className="absolute left-[10px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-card" />
                      <div className="rounded-sm border bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 font-mono text-sm">
                          <span className="text-muted-foreground">
                            ¥{formatAmount(item.oldAmount)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold text-primary">
                            ¥{formatAmount(item.newAmount)}
                          </span>
                          <span
                            className={`ml-2 text-xs ${
                              item.newAmount > item.oldAmount
                                ? 'text-success'
                                : 'text-destructive'
                            }`}
                          >
                            {item.newAmount > item.oldAmount ? '↑' : '↓'}
                            {formatAmount(
                              Math.abs(item.newAmount - item.oldAmount),
                            )}
                          </span>
                        </div>
                        {item.adjustReason && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            原因：{item.adjustReason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量设置弹窗 */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="rounded-sm sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量设置预算</DialogTitle>
            <DialogDescription>
              为 {year}年{month}月 批量设置各部门预算，已存在的部门预算将被覆盖
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>部门</span>
              <span className="text-right">预算金额</span>
              <span></span>
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {batchItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_40px] items-center gap-2"
                >
                  <Input
                    value={item.department}
                    onChange={(e) =>
                      handleBatchRowChange(index, 'department', e.target.value)
                    }
                    placeholder="部门名称"
                  />
                  <Input
                    type="number"
                    value={item.budgetAmount}
                    onChange={(e) =>
                      handleBatchRowChange(
                        index,
                        'budgetAmount',
                        e.target.value,
                      )
                    }
                    placeholder="预算金额"
                    className="font-mono text-right"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleBatchRemoveRow(index)}
                    disabled={batchItems.length <= 1}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleBatchAddRow}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              添加一行
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchOpen(false)}
              disabled={batchSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleBatchSubmit} disabled={batchSubmitting}>
              {batchSubmitting ? '提交中...' : '确认提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
