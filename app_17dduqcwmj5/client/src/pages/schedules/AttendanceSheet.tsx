import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@client/src/components/ui/sheet';
import { ATTENDANCE_STATUSES } from '@shared/schedule';
import { formatPercent } from '@client/src/utils/format';
import type {
  AttendanceItem,
  AttendanceListResponse,
  AttendanceStats,
  SaveAttendanceRecord,
  ScheduleListItem,
} from '@shared/schedule';
import {
  fetchAttendances,
  getErrorMessage,
  saveAttendances,
} from './schedule.api';

interface AttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleListItem | null;
}

const computeStats = (rows: AttendanceItem[]): AttendanceStats => {
  const presentCount: number = rows.filter(
    (row: AttendanceItem) => row.attendanceStatus === '出勤',
  ).length;
  const absentCount: number = rows.filter(
    (row: AttendanceItem) =>
      row.attendanceStatus === '请假' || row.attendanceStatus === '旷课',
  ).length;
  const denominator: number = presentCount + absentCount;
  const attendanceRate: number =
    denominator === 0
      ? 0
      : Math.round((presentCount / denominator) * 1000) / 10;
  return { presentCount, absentCount, attendanceRate };
};

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  open,
  onOpenChange,
  schedule,
}) => {
  const [rows, setRows] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !schedule) {
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    setRows([]);
    fetchAttendances(schedule.id)
      .then((result: AttendanceListResponse) => {
        if (!cancelled) {
          setRows(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('加载考勤记录失败');
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

  const stats: AttendanceStats = computeStats(rows);

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

  const handleSave = async (): Promise<void> => {
    if (!schedule) {
      return;
    }
    const records: SaveAttendanceRecord[] = [];
    rows.forEach((row: AttendanceItem) => {
      if (row.attendanceStatus === null || row.studentId === '') {
        return;
      }
      records.push({
        studentId: row.studentId,
        attendanceStatus: row.attendanceStatus,
        remark: row.remark ?? undefined,
      });
    });
    setSaving(true);
    try {
      const result: AttendanceListResponse = await saveAttendances(
        schedule.id,
        { records },
      );
      setRows(result.items);
      toast.success('考勤保存成功');
      if (result.syncStatus === 'failed') {
        toast.warning('考勤已保存，但同步多维表格失败');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, '保存考勤失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>考勤登记</SheetTitle>
          <SheetDescription>
            {schedule?.scheduleName ?? '排期'} · {schedule?.classDate ?? '日期待定'}{' '}
            {schedule?.startTime ?? '--:--'} ~ {schedule?.endTime ?? '--:--'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2 py-4">
          <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-[hsl(140_60%_35%)]">
              {stats.presentCount}
            </p>
            <p className="text-xs text-muted-foreground">出勤</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-[hsl(5_75%_45%)]">
              {stats.absentCount}
            </p>
            <p className="text-xs text-muted-foreground">缺勤</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
            <p className="text-lg font-bold text-primary">
              {formatPercent(stats.attendanceRate)}
            </p>
            <p className="text-xs text-muted-foreground">出勤率</p>
          </div>
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
                    <Badge className="rounded-full border-transparent bg-accent text-accent-foreground">
                      {row.attendanceStatus}
                    </Badge>
                  ) : null}
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
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                    ) =>
                      updateRow(row.studentId, { remark: event.target.value })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <SheetFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || rows.length === 0}
          >
            {saving ? '保存中...' : '保存考勤'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
