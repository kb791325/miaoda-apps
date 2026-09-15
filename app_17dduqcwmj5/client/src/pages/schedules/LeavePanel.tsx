import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Plus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { PaginationBar } from '@client/src/components/PaginationBar';
import { formatDateTime } from '@client/src/utils/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Textarea } from '@client/src/components/ui/textarea';
import { useLoginState } from '@client/src/hooks/use-login-state';
import { APP_ROLES } from '@shared/roles';
import type { LeaveListItem, LeaveListResponse } from '@shared/leave';
import { LeaveFormDialog } from './LeaveFormDialog';
import { approveLeave, fetchLeaveList } from './leave.api';

const PENDING_STATUS: string = '待审批';
const PAGE_SIZE: number = 50;

const STAFF_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

const getApprovalBadgeClass = (status: string | null): string => {
  if (status === '通过') {
    return 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_30%)]';
  }
  if (status === '不通过') {
    return 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]';
  }
  if (status === PENDING_STATUS) {
    return 'bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_70%_40%)]';
  }
  return 'bg-muted text-muted-foreground';
};

const formatApplyTime = (value: string | null): string =>
  formatDateTime(value);

export const LeavePanel: React.FC = () => {
  const loginState = useLoginState();
  const [items, setItems] = useState<LeaveListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveListItem | null>(null);
  const [rejectRemark, setRejectRemark] = useState<string>('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const loadSeqRef = useRef<number>(0);

  const loadLeaves = useCallback(async (): Promise<void> => {
    const seq: number = loadSeqRef.current + 1;
    loadSeqRef.current = seq;
    setLoading(true);
    try {
      const result: LeaveListResponse = await fetchLeaveList({
        page,
        pageSize: PAGE_SIZE,
      });
      if (seq !== loadSeqRef.current) {
        return;
      }
      setItems(result.items);
      setTotal(result.total);
    } catch {
      if (seq !== loadSeqRef.current) {
        return;
      }
      toast.error('加载请假记录失败');
      setItems([]);
      setTotal(0);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [page]);

  useEffect(() => {
    void loadLeaves();
  }, [loadLeaves]);

  const pendingItems: LeaveListItem[] = items.filter(
    (item: LeaveListItem) => item.approvalStatus === PENDING_STATUS,
  );
  const reviewedItems: LeaveListItem[] = items.filter(
    (item: LeaveListItem) => item.approvalStatus !== PENDING_STATUS,
  );

  const handleApprove = async (item: LeaveListItem): Promise<void> => {
    setReviewingId(item.id);
    try {
      const result = await approveLeave(item.id, { approvalStatus: '通过' });
      toast.success(`已通过 ${item.studentName || '该学员'} 的请假申请`);
      if (result.syncStatus === 'failed') {
        toast.warning('审批已保存，但同步多维表格失败，可在失败行重试');
      }
      await loadLeaves();
    } catch {
      toast.error('审批失败，请重试');
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectSubmit = async (): Promise<void> => {
    if (!rejectTarget) {
      return;
    }
    if (rejectRemark.trim().length === 0) {
      toast.error('请填写驳回备注');
      return;
    }
    setReviewingId(rejectTarget.id);
    try {
      const result = await approveLeave(rejectTarget.id, {
        approvalStatus: '不通过',
        approvalRemark: rejectRemark.trim(),
      });
      toast.success('已驳回该请假申请');
      if (result.syncStatus === 'failed') {
        toast.warning('审批已保存，但同步多维表格失败，可在失败行重试');
      }
      setRejectTarget(null);
      setRejectRemark('');
      await loadLeaves();
    } catch {
      toast.error('审批失败，请重试');
    } finally {
      setReviewingId(null);
    }
  };

  const renderEmptyRow = (colSpan: number, text: string): React.ReactNode => (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="py-8 text-center text-sm text-muted-foreground"
      >
        {loading ? '加载中...' : text}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">请假管理</h3>
          <p className="text-sm text-muted-foreground">
            学员请假提交与校长审批，审批通过后自动同步考勤状态
          </p>
        </div>
        {loginState === 'anonymous' ? (
          <span className="text-sm text-muted-foreground">
            登录后可提交请假申请
          </span>
        ) : (
          <Button
            data-ai-section-type="button"
            className="gap-1"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-4" />
            提交请假
          </Button>
        )}
      </div>

      <CanRole
        roles={STAFF_ROLES}
        fallback={
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            请假申请提交后由校长审批，审批结果可在排期考勤中查看。
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h4 className="mb-3 text-sm font-bold text-foreground">
              待审批（{pendingItems.length}）
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>学员</TableHead>
                    <TableHead>关联排期</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead>请假原因</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.length === 0 ? (
                    renderEmptyRow(6, '暂无待审批的请假申请')
                  ) : (
                    pendingItems.map((item: LeaveListItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-foreground">
                          {item.studentName || '未知学员'}
                        </TableCell>
                        <TableCell>{item.scheduleName || '-'}</TableCell>
                        <TableCell>{item.leaveType ?? '-'}</TableCell>
                        <TableCell>{formatApplyTime(item.applyTime)}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="line-clamp-2 break-words">
                            {item.leaveReason || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <CanRole
                              roles={[APP_ROLES.principal]}
                              fallback={null}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-[hsl(140_60%_35%)] hover:bg-[hsl(140_60%_45%/0.1)] hover:text-[hsl(140_60%_30%)]"
                                disabled={reviewingId === item.id}
                                onClick={() => void handleApprove(item)}
                              >
                                <CheckCircle2 className="size-4" />
                                通过
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-[hsl(5_75%_55%)] hover:bg-[hsl(5_75%_55%/0.08)] hover:text-[hsl(5_75%_40%)]"
                                disabled={reviewingId === item.id}
                                onClick={() => {
                                  setRejectTarget(item);
                                  setRejectRemark('');
                                }}
                              >
                                <XCircle className="size-4" />
                                驳回
                              </Button>
                            </CanRole>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h4 className="mb-3 text-sm font-bold text-foreground">
              已审批记录（{reviewedItems.length}）
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>学员</TableHead>
                    <TableHead>关联排期</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead>审批状态</TableHead>
                    <TableHead>审批备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedItems.length === 0 ? (
                    renderEmptyRow(6, '暂无已审批记录')
                  ) : (
                    reviewedItems.map((item: LeaveListItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-foreground">
                          {item.studentName || '未知学员'}
                        </TableCell>
                        <TableCell>{item.scheduleName || '-'}</TableCell>
                        <TableCell>{item.leaveType ?? '-'}</TableCell>
                        <TableCell>{formatApplyTime(item.applyTime)}</TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full border-transparent ${getApprovalBadgeClass(item.approvalStatus)}`}
                          >
                            {item.approvalStatus ?? '未知'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="line-clamp-2 break-words">
                            {item.approvalRemark || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {!loading && total > 0 && (
            <PaginationBar
              page={page}
              totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              total={total}
              unit="条请假申请"
              onChange={setPage}
            />
          )}
        </div>
      </CanRole>

      <LeaveFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitted={() => void loadLeaves()}
      />

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRejectTarget(null);
            setRejectRemark('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>驳回请假申请</DialogTitle>
            <DialogDescription>
              驳回 {rejectTarget?.studentName || '该学员'} 的请假申请，请填写驳回备注
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="请输入驳回原因"
            value={rejectRemark}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setRejectRemark(event.target.value)
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              取消
            </Button>
            <Button
              className="bg-[hsl(5_75%_55%)] text-white hover:bg-[hsl(5_75%_48%)]"
              disabled={reviewingId === rejectTarget?.id}
              onClick={() => void handleRejectSubmit()}
            >
              {reviewingId === rejectTarget?.id ? '提交中...' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
