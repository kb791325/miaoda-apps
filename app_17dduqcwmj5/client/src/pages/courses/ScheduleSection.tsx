import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type { CourseScheduleBrief } from '@shared/course';
import { fetchCourseSchedules, getStatusBadgeClass } from './course.api';

interface ScheduleSectionProps {
  courseId: string;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  courseId,
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CourseScheduleBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetchCourseSchedules(courseId)
      .then((result: CourseScheduleBrief[]) => {
        if (!cancelled) setItems(result);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const goToSchedules = (): void => {
    navigate('/schedules');
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <CalendarDays className="size-4 text-primary" />
          关联排期
        </h3>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={goToSchedules}
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            查看全部排期
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          该课程暂无关联排期
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item: CourseScheduleBrief) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={goToSchedules}
                className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.scheduleName ?? '未命名排期'}
                  </p>
                  <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{item.classDate ?? '日期待定'}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {item.startTime ?? '--:--'} ~ {item.endTime ?? '--:--'}
                    </span>
                  </p>
                </div>
                <Badge
                  className={`rounded-full border-transparent ${getStatusBadgeClass(item.status)}`}
                >
                  {item.status ?? '未知'}
                </Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
