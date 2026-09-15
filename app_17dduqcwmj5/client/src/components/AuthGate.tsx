import React from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ROLE_SUBJECT, useAuth } from '@lark-apaas/client-toolkit/auth';
import { PAGE_ROLE_MAP } from '@shared/roles';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import LoginPrompt from '@client/src/components/LoginPrompt';
import { useLoginState } from '@client/src/hooks/use-login-state';

const FULL_SCREEN_CENTER =
  'flex min-h-[70vh] w-full items-center justify-center p-6';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className={FULL_SCREEN_CENTER}>
      <div className="w-full max-w-xl">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-3 h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
};

export const AuthErrorScreen: React.FC = () => {
  const handleRetry = (): void => {
    window.location.reload();
  };

  return (
    <div className={FULL_SCREEN_CENTER}>
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div className="text-lg font-bold text-foreground">
          会话加载失败
        </div>
        <p className="text-sm text-muted-foreground">
          身份或权限信息加载超时，请检查网络后重试。
        </p>
        <Button onClick={handleRetry}>
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    </div>
  );
};

const firstAllowedPath = (abilityCan: (role: string) => boolean): string => {
  return (
    Object.entries(PAGE_ROLE_MAP)
      .filter(([path]: [string, string[]]) => path !== '/')
      .find(([, roles]: [string, string[]]) => roles.some(abilityCan))?.[0] ??
    '/consultation'
  );
};

interface AuthGateProps {
  children: React.ReactNode;
  requiredRoles: string[];
  redirectWhenDenied?: boolean;
}

const AuthGate: React.FC<AuthGateProps> = ({
  children,
  requiredRoles,
  redirectWhenDenied = false,
}) => {
  const { ability, isLoading, error } = useAuth();
  const loginState = useLoginState();

  if (isLoading || loginState === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (error) {
    return <AuthErrorScreen />;
  }

  const hasPermission = requiredRoles.some((role: string) =>
    ability.can(role, ROLE_SUBJECT),
  );

  if (hasPermission) {
    return <>{children}</>;
  }

  if (loginState === 'anonymous') {
    return <LoginPrompt />;
  }

  if (redirectWhenDenied) {
    const target = firstAllowedPath((role: string) =>
      ability.can(role, ROLE_SUBJECT),
    );
    return <Navigate to={target} replace />;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default AuthGate;
