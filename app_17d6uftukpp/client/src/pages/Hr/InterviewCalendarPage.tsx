import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, List, MapPin, Video, Phone, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { useModuleData } from '@/lib/data-service';
import { formatUserName } from '@/lib/user-names';
import { cn } from '@/lib/utils';

interface InterviewEntry {
  id: string;
  name: string;
  position: string;
  fullDate: Date;
  dateStr: string;
  timeStr: string;
  method: string;
  location: string;
  link: string;
  round: string;
  interviewer: string;
  status: string;
}

const METHOD_ICONS: Record<string, typeof Video> = {
  '现场面试': MapPin,
  '现场': MapPin,
  '视频面试': Video,
  '视频': Video,
  '电话面试': Phone,
  '电话': Phone,
};

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeStr(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/** 从多维表格原始值中解析 datetime 字段（毫秒时间戳或 ISO 字符串） */
function parseDateTime(raw: string | number | undefined): Date | null {
  if (raw === undefined || raw === null) return null;
  // 多维表格 DateTime 返回毫秒时间戳（number）
  const n = Number(raw);
  if (!Number.isNaN(n) && n > 1000000000000) {
    return new Date(n);
  }
  // 尝试 ISO 字符串
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

export default function InterviewCalendarPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(8);

  const { records, loading } = useModuleData('interviewInvite' as any);

  const interviews = useMemo(() => {
    return records.map((r) => {
      // 字段映射：按真实 bitable 字段名
      const name = String(r.values.f2 ?? r.values['候选人姓名'] ?? '');
      const position = String(r.values.f10 ?? r.values['应聘岗位'] ?? '');
      // 面试时间：DateTime 字段，取 f15 或「面试时间」
      const rawTime = r.values.f15 ?? r.values['面试时间'];
      const dt = parseDateTime(rawTime as string | number | undefined);
      const method = String(r.values.f4 ?? r.values['面试方式'] ?? '');
      const location = String(r.values.f0 ?? r.values['面试地点'] ?? '');
      const link = String(r.values.f1 ?? r.values['会议链接'] ?? '');
      const round = String(r.values.round ?? r.values['面试轮次'] ?? '');
      const interviewer = String(r.values.interviewer ?? r.values['面试官'] ?? '');
      const status = String(r.values.status ?? r.values['邀约状态'] ?? '');

      return {
        id: r.recordId,
        name: formatUserName(name),
        position,
        fullDate: dt,
        dateStr: dt ? formatDateStr(dt) : '—',
        timeStr: dt ? formatTimeStr(dt) : '—',
        method,
        location,
        link,
        round,
        interviewer: formatUserName(interviewer),
        status,
      } as InterviewEntry;
    });
  }, [records]);

  // 日历计算
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDay = new Date(calendarYear, calendarMonth, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);

    return days;
  }, [calendarYear, calendarMonth]);

  const monthLabel = `${calendarYear}年${calendarMonth}月`;

  const prevMonth = () => {
    if (calendarMonth === 1) { setCalendarYear(calendarYear - 1); setCalendarMonth(12); }
    else setCalendarMonth(calendarMonth - 1);
  };
  const nextMonth = () => {
    if (calendarMonth === 12) { setCalendarYear(calendarYear + 1); setCalendarMonth(1); }
    else setCalendarMonth(calendarMonth + 1);
  };

  const interviewsOnDay = (day: number) =>
    interviews.filter((iv) => {
      if (!iv.fullDate) return false;
      return iv.fullDate.getFullYear() === calendarYear &&
        iv.fullDate.getMonth() + 1 === calendarMonth &&
        iv.fullDate.getDate() === day;
    });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === calendarYear &&
    today.getMonth() + 1 === calendarMonth &&
    today.getDate() === day;

  const statusTone = (s: string) => {
    if (s.includes('已确认')) return 'default' as const;
    if (s.includes('已完成')) return 'secondary' as const;
    if (s.includes('已取消')) return 'destructive' as const;
    if (s.includes('已发送')) return 'outline' as const;
    return 'secondary' as const;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">面试日历</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {interviews.length} 条邀约
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border/60 bg-muted/50 p-0.5">
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm" className="h-8"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="size-4" /> 日历
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm" className="h-8"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" /> 列表
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : viewMode === 'calendar' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="size-5" /></Button>
              <CardTitle className="text-lg">{monthLabel}</CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="size-5" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 星期头 */}
            <div className="grid grid-cols-7 border-b border-border pb-2">
              {DAY_NAMES.map((name) => (
                <div key={name} className="text-center text-xs font-medium text-muted-foreground">{name}</div>
              ))}
            </div>
            {/* 日期格子 */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
                const events = interviewsOnDay(day);
                const todayClass = isToday(day) ? 'bg-primary/10 rounded-full' : '';
                return (
                  <div
                    key={day}
                    className={cn(
                      'aspect-square border-b border-r border-border/40 p-1 text-xs',
                      events.length > 0 && 'bg-blue-50/50 dark:bg-blue-950/30',
                    )}
                  >
                    <div className={cn('flex size-6 items-center justify-center font-medium', todayClass)}>
                      {day}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] leading-tight text-primary cursor-pointer"
                          onClick={() => navigate(`/sub/interviewInvite/${ev.id}`)}
                          title={`${ev.name} ${ev.timeStr}`}
                        >
                          {ev.timeStr} {ev.name}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{events.length - 2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : interviews.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>暂无面试邀约</EmptyTitle>
            <EmptyDescription>当前没有面试邀约记录</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">应聘者</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">应聘岗位</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">面试日期</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">方式</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">地点</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">面试官</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => {
                    const MethodIcon = METHOD_ICONS[iv.method] ?? Users;
                    return (
                      <tr
                        key={iv.id}
                        className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/50"
                        onClick={() => navigate(`/sub/interviewInvite/${iv.id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{iv.name || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">{iv.position || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">{iv.dateStr}</td>
                        <td className="whitespace-nowrap px-4 py-3">{iv.timeStr}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-1">
                            <MethodIcon className="size-3.5 text-muted-foreground" />
                            {iv.method || '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 max-w-[160px] truncate">{iv.location || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">{iv.interviewer || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant={statusTone(iv.status)} className="text-xs">{iv.status || '—'}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}