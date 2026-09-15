import React, { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Progress } from '@client/src/components/ui/progress';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { formatPercent } from '@client/src/utils/format';
import type { StudentAttendanceSummary } from '@shared/graduation';
import { fetchStudentAttendanceSummary } from './graduation.api';

interface StudentAttendanceSummaryTabProps {
  studentId: string;
}

interface SummaryCell {
  label: string;
  value: number;
  accentClass: string;
}

export const StudentAttendanceSummaryTab: React.FC<
  StudentAttendanceSummaryTabProps
> = ({ studentId }) => {
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [unsupported, setUnsupported] = useState<boolean>(false);

  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    setUnsupported(false);
    fetchStudentAttendanceSummary(studentId)
      .then((result: StudentAttendanceSummary | null) => {
        if (cancelled) return;
        if (result === null) {
          setUnsupported(true);
        } else {
          setSummary(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setUnsupported(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (unsupported || summary === null) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <CalendarCheck className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          暂无考勤汇总数据
        </p>
      </div>
    );
  }

  const cells: SummaryCell[] = [
    {
      label: '出勤',
      value: summary.present,
      accentClass: 'text-[hsl(140_60%_35%)]',
    },
    {
      label: '迟到',
      value: summary.late,
      accentClass: 'text-[hsl(38_85%_40%)]',
    },
    {
      label: '早退',
      value: summary.earlyLeave,
      accentClass: 'text-[hsl(38_85%_40%)]',
    },
    {
      label: '缺勤',
      value: summary.absent,
      accentClass: 'text-[hsl(5_75%_45%)]',
    },
    {
      label: '请假',
      value: summary.leave,
      accentClass: 'text-[hsl(220_70%_50%)]',
    },
    {
      label: '总记录',
      value: summary.total,
      accentClass: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-l-4 border-l-primary border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">整体出勤率</p>
          <p className="text-lg font-bold text-primary">
            {formatPercent(summary.attendanceRate)}
          </p>
        </div>
        <Progress
          className="mt-3"
          value={Math.min(summary.attendanceRate, 100)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cells.map((cell: SummaryCell) => (
          <div
            key={cell.label}
            className="rounded-lg border border-border bg-card p-3 text-center shadow-sm"
          >
            <p className={`text-xl font-bold ${cell.accentClass}`}>
              {cell.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{cell.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
