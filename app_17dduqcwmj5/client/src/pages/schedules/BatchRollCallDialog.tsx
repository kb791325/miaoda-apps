import React, { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { ATTENDANCE_STATUSES } from '@shared/schedule';
import { formatPercent } from '@client/src/utils/format';
import type {
  AttendanceItem,
  AttendanceListResponse,
  BatchAttendanceItem,
  BatchAttendanceRequest,
  ScheduleAttendanceSummary,
  ScheduleListItem,
} from '@shared/schedule';
import { getAttendanceBadgeClass } from './attendanceStatus';
import {
  batchSaveAttendance,
  fetchRollCall,
  fetchScheduleAttendanceSummary,
  getErrorMessage,
} from './schedule.api';

const PRESENT_STATUS: string = '出勤';

interface BatchRollCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleListItem | null;
  onSaved?: () => void;
}

export const BatchRollCallDialog: React.FC<BatchRollCallDialogProps> = ({
  open,
  onOpenChange,
  schedule,
  onSaved,
}) => {
  const [rows, setRows] = useState<AttendanceItem[]>([]);
  const [summary, setSummary] = useState<ScheduleAttendanceSummary | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !schedule) {
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    setRows([]);
    setSummary(null);
    const scheduleId: string = schedule.id;
    Promise.all([
      fetchRollCall(scheduleId),
      fetchScheduleAttendanceSummary(scheduleId).catch(() => null),
    ])
      .then(
        ([rollCall, stats]: [
          AttendanceListResponse,
          ScheduleAttendanceSummary | null,
        ]) => {
          if (!cancelled) {
            setRows(rollCall.items);
            setSummary(stats);
          }
        },
      )
      .catch(() => {
        if (!cancelled) {
          toast.error('加载点名数据失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, schedule]);

  const updateRow = (
    studentId: string,
    patch: Partial<Pick<AttendanceItem, 'attendanceStatus' | 'remark'>>,
  ): void => {
    setRows((prev: AttendanceItem[]) =>
      prev.map((row: AttendanceItem) =>
        row.studentId === studentId ? { ...row, ...patch } : row,
      ),
    );
  };

  const handleMarkAllPresent = (): void => {
    setRows((prev: AttendanceItem[]) =>
      prev.map(
        (row: AttendanceItem): AttendanceItem => ({
          ...row,
          attendanceStatus: PRESENT_STATUS,
        }),
      ),
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!schedule) {
      return;
    }
    const items: BatchAttendanceItem[] = [];
    rows.forEach((row: AttendanceItem) => {
      // 与考勤登记入口保持一致：未点名行不落库，避免静默记出勤
      if (row.studentId === '' || row.attendanceStatus === null) {
        return;
      }
      items.push({
        studentId: row.studentId,
        status: row.attendanceStatus,
        remark: row.remark ?? undefined,
      });
    });
    if (items.length === 0) {
      toast.error('暂无已点名的学员，请先选择考勤状态');
      return;
    }
    const payload: BatchAttendanceRequest = {
      scheduleId: schedule.id,
      items,
    };
    setSaving(true);
    try {
      const result: AttendanceListResponse =
        await batchSaveAttendance(payload);
      setRows(result.items);
      toast.success('批量点名保存成功');
      if (result.syncStatus === 'failed') {
        toast.warning('考勤已保存，但同步多维表格失败，可在失败行重试');
      }
      // 刷新该排期考勤统计展示
      try {
        const stats: ScheduleAttendanceSummary =
          await fetchScheduleAttendanceSummary(schedule.id);
        setSummary(stats);
      } catch {
        // 统计刷新失败不阻塞主流程
      }
      onSaved?.();
    } catch (error) {
      toast.error(getErrorMessage(error, '批量点名保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量点名</DialogTitle>
          <DialogDescription>
            {schedule?.scheduleName || '未命名排期'} ·{' '}
            {schedule?.classDate ?? '日期待定'} {schedule?.startTime ?? '--:--'}{' '}
            ~ {schedule?.endTime ?? '--:--'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground">
              {summary?.expected ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">应到</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-[hsl(140_60%_35%)]">
              {summary?.present ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">出勤</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-primary">
              {formatPercent(summary?.attendanceRate)}
            </p>
            <p className="text-xs text-muted-foreground">出勤率</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            未点名的学员不会被保存，可逐个选择或一键全部记为出勤
          </p>
          <Button
            data-ai-section-type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || rows.length === 0}
            onClick={handleMarkAllPresent}
          >
            <CheckCheck className="size-3.5" />
            全部记为出勤
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              加载中...
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              该排期暂无报名学员
            </p>
          ) : (
            rows.map((row: AttendanceItem) => (
              <div
                key={row.studentId}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.studentName || '未知学员'}
                  </p>
                  {row.attendanceStatus ? (
                    <Badge
                      className={`rounded-full border-transparent ${getAttendanceBadgeClass(row.attendanceStatus)}`}
                    >
                      {row.attendanceStatus}
                    </Badge>
                  ) : (
                    <Badge className="rounded-full border-transparent bg-muted text-muted-foreground">
                      未点名
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={row.attendanceStatus ?? undefined}
                    onValueChange={(value: string) =>
                      updateRow(row.studentId, { attendanceStatus: value })
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="考勤状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((status: string) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="min-w-[140px] flex-1"
                    placeholder="备注"
                    value={row.remark ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(row.studentId, { remark: event.target.value })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || loading || rows.length === 0}
          >
            {saving ? '保存中...' : '保存点名'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
