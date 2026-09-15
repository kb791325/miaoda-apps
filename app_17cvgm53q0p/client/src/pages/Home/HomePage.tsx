import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { fetchHomeTodos, type HomeTodoItem } from '@client/src/api/home';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { useAuth } from '@client/src/hooks/use-auth';
import HomeQuickCards from './HomeQuickCards';
import HomeOverdueCard from './HomeOverdueCard';
import HomeDashboard from './HomeDashboard';

interface TodoState {
  items: HomeTodoItem[];
  loading: boolean;
}

/** 待办事项卡片：挂载后按角色拉取，失败静默降级为「暂无待办」 */
const TodoCard: React.FC<{ roleCode: string }> = ({ roleCode }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<TodoState>({ items: [], loading: true });

  useEffect(() => {
    let mounted = true;
    setState({ items: [], loading: true });
    fetchHomeTodos(roleCode)
      .then((res) => {
        if (mounted) setState({ items: res.items ?? [], loading: false });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`待办事项加载失败: ${message}`);
        if (mounted) setState({ items: [], loading: false });
      });
    return () => {
      mounted = false;
    };
  }, [roleCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">待办事项</CardTitle>
      </CardHeader>
      <CardContent>
        {state.loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : state.items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            当前没有待处理事项
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {state.items.map((item: HomeTodoItem) => (
              <li key={`${item.label}-${item.path}`}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-3 text-left transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-base text-foreground">
                    {item.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      {item.count}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

/** 工作台首页：问候 + 快捷操作卡片 + 待办事项 + 数据总览（有仪表盘权限时展示） */
const HomePage: React.FC = () => {
  const { user, hasPerm } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{user.name}，欢迎回来</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          当前角色：{user.roleName} · 以下是您常用的功能入口与待办事项
        </p>
      </div>

      <HomeQuickCards roleCode={user.roleCode} hasPerm={hasPerm} />

      <TodoCard roleCode={user.roleCode} />

      {hasPerm('finance:receivable:view') && <HomeOverdueCard />}

      {hasPerm('dashboard:view') && <HomeDashboard />}
    </div>
  );
};

export default HomePage;
