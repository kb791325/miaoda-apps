import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '@client/src/hooks/usePagination';
import {
  Plus,
  Search,
  CalendarCheck,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  RotateCcw,
  Eye,
  FileText,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Label } from '@client/src/components/ui/label';
import { Badge } from '@client/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import PaginationFooter from '@client/src/components/ui/pagination-footer';
import { cn } from '@client/src/lib/utils';
import { formatDate } from '@client/src/utils/format';
import { UserDisplay } from '@client/src/components/business-ui/user-display';

import {
  getReservations,
  getReservationStats,
  approveReservation,
  rejectReservation,
  borrowAsset,
  returnAsset,
  cancelReservation,
} from '@client/src/api/asset-reservations';
import type {
  AssetReservationItem,
  ReservationStatus,
  ReservationStats,
} from '@shared/api.interface';

import ApprovalDialog from '@client/src/components/ApprovalDialog';
import BorrowDialog from '@client/src/components/BorrowDialog';
import ReturnDialog from '@client/src/components/ReturnDialog';

const RESERVATION_STATUS_OPTIONS: {
  value: ReservationStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'borrowed', label: '已借出' },
  { value: 'returned', label: '已归还' },
  { value: 'cancelled', label: '已取消' },
];

const statusLabelMap: Record<ReservationStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  borrowed: '已借出',
  returned: '已归还',
  cancelled: '已取消',
};

const statusStyleMap: Record<ReservationStatus, string> = {
  pending: 'border-orange-200 bg-orange-50 text-orange-700',
  approved: 'border-blue-200 bg-blue-50 text-blue-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  borrowed: 'border-purple-200 bg-purple-50 text-purple-700',
  returned: 'border-green-200 bg-green-50 text-green-700',
  cancelled: 'border-gray-200 bg-gray-50 text-gray-500',
};

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
}: StatCardProps) => (
  <Card className="rounded-sm border-border bg-card">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-sm flex items-center justify-center ${iconBg}`}
        >
          <Icon className={`size-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="font-mono text-xl font-semibold text-foreground tabular-nums truncate">
            {value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: ReservationStatus }) => (
  <Badge
    className={cn(
      'rounded-sm font-medium border px-2 py-0.5 text-xs',
      statusStyleMap[status],
    )}
    variant="outline"
  >
    {statusLabelMap[status]}
  </Badge>
);

const ReservationListPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [filterVersion, setFilterVersion] = useState(0);
  const pagination = usePagination({ initialPage: 1, initialPageSize: 10 });
  const { page, pageSize, totalPages } = pagination;

  const [items, setItems] = useState<AssetReservationItem[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<number | undefined>(undefined);
  const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const abortControllerRef = useRef<AbortController | null>(null);

  const navigate = useNavigate();

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>(
    'approve',
  );
  const [approvalTarget, setApprovalTarget] =
    useState<AssetReservationItem | null>(null);

  const [borrowOpen, setBorrowOpen] = useState(false);
  const [borrowTarget, setBorrowTarget] = useState<AssetReservationItem | null>(
    null,
  );

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<AssetReservationItem | null>(
    null,
  );

  const buildParams = () => ({
    keyword: keyword || undefined,
    status: status === 'all' ? undefined : (status as ReservationStatus),
  });

  const { setTotal } = pagination;

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    try {
      const filterParams = buildParams();
      const [listData, statsData] = await Promise.all([
        getReservations({ ...filterParams, page, pageSize }, controller.signal),
        getReservationStats(controller.signal),
      ]);
      setItems(listData.items);
      setTotal(listData.total);
      setStats(statsData);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      logger.error('加载预约列表失败', err);
      toast.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, status, setTotal]);

  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      pagination.resetPage();
      setFilterVersion((v) => v + 1);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, status]);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, filterVersion]);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    pagination.resetPage();
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setStatus('all');
    pagination.resetPage();
    fetchData();
  };

  const handleApprove = (item: AssetReservationItem) => {
    setApprovalMode('approve');
    setApprovalTarget(item);
    setApprovalOpen(true);
  };

  const handleReject = (item: AssetReservationItem) => {
    setApprovalMode('reject');
    setApprovalTarget(item);
    setApprovalOpen(true);
  };

  const handleApprovalConfirm = async (
    mode: 'approve' | 'reject',
    remark: string,
  ) => {
    if (!approvalTarget) return;
    try {
      if (mode === 'approve') {
        await approveReservation(approvalTarget.id, remark);
        toast.success('预约已批准');
      } else {
        await rejectReservation(approvalTarget.id, remark);
        toast.success('预约已拒绝');
      }
      setApprovalOpen(false);
      setApprovalTarget(null);
      fetchData();
    } catch (err: unknown) {
      logger.error('操作失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const handleBorrow = (item: AssetReservationItem) => {
    setBorrowTarget(item);
    setBorrowOpen(true);
  };

  const handleBorrowConfirm = async () => {
    if (!borrowTarget) return;
    try {
      await borrowAsset(borrowTarget.id);
      toast.success('借出操作已确认');
      setBorrowOpen(false);
      setBorrowTarget(null);
      fetchData();
    } catch (err: unknown) {
      logger.error('借出操作失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const handleReturn = (item: AssetReservationItem) => {
    setReturnTarget(item);
    setReturnOpen(true);
  };

  const handleReturnConfirm = async (remark: string) => {
    if (!returnTarget) return;
    try {
      await returnAsset(returnTarget.id, remark);
      toast.success('归还操作已确认');
      setReturnOpen(false);
      setReturnTarget(null);
      fetchData();
    } catch (err: unknown) {
      logger.error('归还操作失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const handleCancel = async (item: AssetReservationItem) => {
    try {
      await cancelReservation(item.id);
      toast.success('预约已取消');
      fetchData();
    } catch (err: unknown) {
      logger.error('取消预约失败', err);
      toast.error('操作失败，请重试');
    }
  };

  const renderActions = (item: AssetReservationItem) => {
    switch (item.status) {
      case 'pending':
        return (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => handleApprove(item)}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              批准
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => handleReject(item)}
            >
              <XCircle className="size-3.5 mr-1" />
              拒绝
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm h-7 text-xs border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              onClick={() => handleCancel(item)}
            >
              <Ban className="size-3.5 mr-1" />
              取消
            </Button>
          </div>
        );
      case 'approved':
        return (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            <Button
              size="sm"
              className="rounded-sm h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => handleBorrow(item)}
            >
              <ArrowRightLeft className="size-3.5 mr-1" />
              借出
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm h-7 text-xs border-border text-muted-foreground hover:bg-accent"
              onClick={() => navigate(`/asset-reservations/${item.id}`)}
            >
              <Eye className="size-3.5 mr-1" />
              详情
            </Button>
          </div>
        );
      case 'borrowed':
        return (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            <Button
              size="sm"
              className="rounded-sm h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleReturn(item)}
            >
              <RotateCcw className="size-3.5 mr-1" />
              归还
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm h-7 text-xs border-border text-muted-foreground hover:bg-accent"
              onClick={() => navigate(`/asset-reservations/${item.id}`)}
            >
              <Eye className="size-3.5 mr-1" />
              详情
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm h-7 text-xs border-border text-muted-foreground hover:bg-accent"
              onClick={() => navigate(`/asset-reservations/${item.id}`)}
            >
              <Eye className="size-3.5 mr-1" />
              详情
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">资产预约管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            资产预约申请、审批、借出与归还管理
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/asset-reservations/create')}
          className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          data-ai-section-type="button"
        >
          <Plus className="size-4 mr-1" />
          新建预约
        </Button>
      </div>

      {/* 统计卡片 */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3"
        data-ai-section-type="card-stat"
      >
        <StatCard
          label="预约总数"
          value={stats ? String(stats.total) : '-'}
          icon={CalendarCheck}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="待审批"
          value={stats ? String(stats.pending) : '-'}
          icon={Clock}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          label="已批准"
          value={stats ? String(stats.approved) : '-'}
          icon={CheckCircle2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="已拒绝"
          value={stats ? String(stats.rejected) : '-'}
          icon={XCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          label="已借出"
          value={stats ? String(stats.borrowed) : '-'}
          icon={ArrowRightLeft}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          label="已归还"
          value={stats ? String(stats.returned) : '-'}
          icon={RotateCcw}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* 快速筛选标签 */}
      <div className="flex items-center gap-1 flex-wrap">
        {[
          { value: 'all', label: '全部' },
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已批准' },
          { value: 'borrowed', label: '已借出' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors duration-150',
              status === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground border border-border',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 筛选栏 */}
      <Card className="rounded-sm border-border bg-card">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                关键词
              </Label>
              <Input
                placeholder="资产名称 / 单号 / 申请人"
                value={keyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setKeyword(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === 'Enter' && handleSearch()
                }
                className="w-full min-w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                状态
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESERVATION_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="rounded-sm border-border text-foreground hover:bg-accent"
              >
                重置
              </Button>
              <Button
                size="sm"
                onClick={handleSearch}
                className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Search className="size-4 mr-1" />
                搜索
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 表格区 */}
      <Card className="rounded-sm border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">预约列表</h2>
          <span className="text-xs text-muted-foreground">
            共 {pagination.total} 条记录
          </span>
        </div>
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50 w-40">
                  预约单号
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50">
                  资产名称
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50">
                  申请人
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50 w-24">
                  状态
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50">
                  预计借出
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50">
                  预计归还
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted/50 w-52 text-right">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    加载中...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: AssetReservationItem) => (
                  <TableRow
                    key={item.id}
                    className="border-border h-10 hover:bg-accent transition-colors even:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs tabular-nums">
                      {item.reservationNo}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-muted-foreground" />
                        <span>{item.assetName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserDisplay
                        value={[item.requesterId]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.expectedBorrowDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.expectedReturnDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderActions(item)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationFooter
            total={pagination.total}
            page={page}
            totalPages={totalPages}
            onPageChange={pagination.setPage}
          />
        </div>
      </Card>

      {/* 审批对话框 */}
      <ApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        mode={approvalMode}
        reservation={approvalTarget}
        onConfirm={handleApprovalConfirm}
      />

      {/* 借出确认对话框 */}
      <BorrowDialog
        open={borrowOpen}
        onOpenChange={setBorrowOpen}
        reservation={borrowTarget}
        onConfirm={handleBorrowConfirm}
      />

      {/* 归还对话框 */}
      <ReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        reservation={returnTarget}
        onConfirm={handleReturnConfirm}
      />
    </div>
  );
};

export default ReservationListPage;