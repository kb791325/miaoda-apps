import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { toast } from 'sonner';
import dayjs, { Dayjs } from 'dayjs';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarContentBrief } from '@shared/content';
import { extractErrorMessage, fetchMarketingCalendar } from './content.api';
import { CONTENT_TYPE_LABELS } from './content.constants';
import { StatusBadge } from './StatusBadge';

const WEEKDAYS: string[] = ['一', '二', '三', '四', '五', '六', '日'];

interface CalendarCell {
  date: string;
  day: number;
}

interface PublishCalendarProps {
  onViewDetail: (id: string) => void;
}

export const PublishCalendar: FC<PublishCalendarProps> = ({ onViewDetail }) => {
  const [cursor, setCursor] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [dayMap, setDayMap] = useState<Record<string, CalendarContentBrief[]>>(
    {},
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthParam: string = cursor.format('YYYY-MM');

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchMarketingCalendar(monthParam);
      const nextMap: Record<string, CalendarContentBrief[]> = {};
      for (const item of response.items) {
        nextMap[item.date] = item.contents;
      }
      setDayMap(nextMap);
    } catch (error) {
      toast.error(extractErrorMessage(error, '获取发布日历失败'));
    } finally {
      setLoading(false);
    }
  }, [monthParam]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const cells: Array<CalendarCell | null> = useMemo(() => {
    const daysInMonth: number = cursor.daysInMonth();
    const leading: number = (cursor.day() + 6) % 7;
    const totalCells: number = Math.ceil((leading + daysInMonth) / 7) * 7;
    const list: Array<CalendarCell | null> = [];
    for (let i = 0; i < totalCells; i += 1) {
      const dayNum: number = i - leading + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        list.push(null);
      } else {
        list.push({
          date: cursor.date(dayNum).format('YYYY-MM-DD'),
          day: dayNum,
        });
      }
    }
    return list;
  }, [cursor]);

  const todayStr: string = dayjs().format('YYYY-MM-DD');
  const selectedContents: CalendarContentBrief[] = selectedDate
    ? dayMap[selectedDate] ?? []
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold">{cursor.format('YYYY年M月')}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor((prev: Dayjs) => prev.subtract(1, 'month'))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(dayjs().startOf('month'))}>
            本月
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor((prev: Dayjs) => prev.add(1, 'month'))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {WEEKDAYS.map((weekday: string) => (
              <div
                key={weekday}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                周{weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {cells.map((cell: CalendarCell | null, index: number) => {
              if (cell === null) {
                return <div key={`blank-${index}`} className="min-h-24 bg-muted/40" />;
              }
              const contents: CalendarContentBrief[] = dayMap[cell.date] ?? [];
              const isToday: boolean = cell.date === todayStr;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => {
                    if (contents.length > 0) setSelectedDate(cell.date);
                  }}
                  className={cn(
                    'flex min-h-24 flex-col items-start gap-1 bg-card p-2 text-left transition-colors',
                    contents.length > 0 && 'cursor-pointer hover:bg-accent/60',
                    isToday && 'bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'text-sm',
                      isToday && 'font-bold text-primary',
                    )}
                  >
                    {cell.day}
                  </span>
                  {contents.length > 0 && (
                    <>
                      <span className="inline-flex w-fit items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary-foreground">
                        {contents.length} 条
                      </span>
                      <span className="line-clamp-1 w-full text-xs text-muted-foreground">
                        {contents[0].title}
                      </span>
                      {contents.length > 1 && (
                        <span className="text-[11px] text-muted-foreground">
                          +{contents.length - 1} 条
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={selectedDate !== null}
        onOpenChange={(next: boolean) => {
          if (!next) setSelectedDate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDate ?? ''} 计划发布</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {selectedContents.map((content: CalendarContentBrief) => (
              <div
                key={content.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
              >
                <span className="min-w-0 flex-1 break-words text-sm font-medium">
                  {content.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CONTENT_TYPE_LABELS[content.contentType] ?? content.contentType}
                </span>
                <StatusBadge status={content.status} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewDetail(content.id)}
                >
                  查看
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
