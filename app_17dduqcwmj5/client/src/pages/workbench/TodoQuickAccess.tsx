import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ClipboardList, PhoneCall, Wallet, type LucideIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type { DashboardTodoSummary } from '@shared/dashboard';
import type { LeadTodoItem } from '@shared/lead';
import { fetchLeadTodos } from './dashboard.api';

interface TodoQuickAccessProps {
  todo: DashboardTodoSummary | null;
  loading: boolean;
}

interface TodoEntryConfig {
  key: keyof DashboardTodoSummary;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  iconClassName: string;
  countClassName: string;
}

const TODO_ENTRY_CONFIGS: TodoEntryConfig[] = [
  {
    key: 'pendingReviewCount',
    title: '待审核内容',
    description: '招生内容待审核，前往内容中心处理',
    path: '/content-center',
    icon: ClipboardList,
    iconClassName: 'bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_70%_48%)]',
    countClassName: 'text-[hsl(220_70%_48%)]',
  },
  {
    key: 'nearFullScheduleCount',
    title: '临满/满员排期',
    description: '剩余名额不足 20%，关注排期容量',
    path: '/schedules',
    icon: AlertTriangle,
    iconClassName: 'bg-[hsl(38_85%_55%/0.14)] text-[hsl(38_85%_42%)]',
    countClassName: 'text-[hsl(38_85%_42%)]',
  },
  {
    key: 'unpaidStudentCount',
    title: '未缴清学员',
    description: '学费尚未缴清，及时跟进缴费',
    path: '/students',
    icon: Wallet,
    iconClassName: 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_45%)]',
    countClassName: 'text-[hsl(5_75%_45%)]',
  },
];

const TodoQuickAccess: React.FC<TodoQuickAccessProps> = ({ todo, loading }) => {
  const navigate = useNavigate();
  const [leadTodos, setLeadTodos] = useState<LeadTodoItem[] | null>(null);
  const [leadTodosLoading, setLeadTodosLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled: boolean = false;
    setLeadTodosLoading(true);
    fetchLeadTodos()
      .then((result) => {
        if (!cancelled) setLeadTodos(result.items);
      })
      .catch((error: unknown) => {
        logger.error('工作台待跟进线索加载失败', error);
        if (!cancelled) setLeadTodos([]);
      })
      .finally(() => {
        if (!cancelled) setLeadTodosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const leadTodoCount: number = leadTodos?.length ?? 0;
  const overdueLeadCount: number =
    leadTodos?.filter((item: LeadTodoItem) => item.overdue).length ?? 0;

  const leadTodoCard: React.ReactElement =
    leadTodosLoading ? (
      <Card className="p-6">
        <Skeleton className="mb-3 size-10 rounded-lg" />
        <Skeleton className="mb-2 h-6 w-16" />
        <Skeleton className="h-4 w-40" />
      </Card>
    ) : (
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate('/leads')}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter') {
            navigate('/leads');
          }
        }}
        className="cursor-pointer rounded-lg p-6 transition-colors duration-150 ease-out hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PhoneCall className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {leadTodoCount}
              </span>
              <span className="text-sm font-medium text-foreground">
                待跟进线索
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {overdueLeadCount > 0
                ? `${overdueLeadCount} 条已逾期，点击前往招生线索跟进`
                : '今日待跟进线索，点击前往招生线索处理'}
            </p>
          </div>
        </div>
      </Card>
    );

  if (loading) {
    return (
      <div
        data-ai-section-type="card-menu"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {TODO_ENTRY_CONFIGS.map((config: TodoEntryConfig) => (
          <Card key={config.key} className="p-6">
            <Skeleton className="mb-3 size-10 rounded-lg" />
            <Skeleton className="mb-2 h-6 w-16" />
            <Skeleton className="h-4 w-40" />
          </Card>
        ))}
        {leadTodoCard}
      </div>
    );
  }

  if (!todo) {
    return (
      <div
        data-ai-section-type="card-menu"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="p-6 lg:col-span-3">
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
            <AlertCircle className="size-6" />
            <p className="text-sm">待办数据加载失败或暂无待办事项</p>
          </div>
        </Card>
        {leadTodoCard}
      </div>
    );
  }

  return (
    <div
      data-ai-section-type="card-menu"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {TODO_ENTRY_CONFIGS.map((config: TodoEntryConfig) => {
        const IconComponent: LucideIcon = config.icon;
        const count: number = todo[config.key];
        return (
          <Card
            key={config.key}
            role="button"
            tabIndex={0}
            onClick={() => navigate(config.path)}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter') {
                navigate(config.path);
              }
            }}
            className="cursor-pointer rounded-lg p-6 transition-colors duration-150 ease-out hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <div className="flex items-start gap-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${config.iconClassName}`}
              >
                <IconComponent className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${config.countClassName}`}>
                    {count}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {config.title}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
      {leadTodoCard}
    </div>
  );
};

export default TodoQuickAccess;
