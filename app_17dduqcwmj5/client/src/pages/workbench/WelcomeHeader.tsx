import React from 'react';
import { ROLE_SUBJECT, useAuth } from '@lark-apaas/client-toolkit/auth';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { APP_ROLES, type AppRole } from '@shared/roles';
import { Skeleton } from '@client/src/components/ui/skeleton';

const WORKBENCH_ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  [APP_ROLES.principal]: '校长',
  [APP_ROLES.recruitmentTeacher]: '招生老师',
  [APP_ROLES.teachingTeacher]: '授课老师',
  [APP_ROLES.student]: '学员',
};

function getWorkbenchGreeting(hour: number): string {
  if (hour >= 5 && hour < 11) {
    return '早上好';
  }
  if (hour >= 11 && hour < 13) {
    return '中午好';
  }
  if (hour >= 13 && hour < 18) {
    return '下午好';
  }
  return '晚上好';
}

const WelcomeHeader: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const { ability, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
    );
  }

  const currentRole: AppRole | undefined = Object.values(APP_ROLES).find(
    (role: AppRole) => ability.can(role, ROLE_SUBJECT),
  );
  const greeting: string = getWorkbenchGreeting(new Date().getHours());
  const displayName: string = userInfo.name || '同学';

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-foreground">
        {greeting}，{displayName}
        {currentRole ? `（${WORKBENCH_ROLE_DISPLAY_NAMES[currentRole]}）` : ''}
      </h1>
      <p className="text-sm text-muted-foreground">
        欢迎回到飘飘香餐饮培训管理工作台，这里汇总了最新的教务经营数据与待办事项
      </p>
    </div>
  );
};

export default WelcomeHeader;
