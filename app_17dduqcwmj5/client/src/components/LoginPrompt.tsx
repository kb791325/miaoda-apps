import React from 'react';
import { LogIn } from 'lucide-react';
import { authClient } from '@lark-apaas/client-toolkit/auth';
import { Button } from '@client/src/components/ui/button';

const LoginPrompt: React.FC = () => {
  const handleLogin = (): void => {
    authClient.session.redirectToLogin();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent">
          <LogIn className="size-6 text-accent-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          欢迎使用飘香餐饮培训管理系统
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          请先登录后继续访问系统
        </p>
        <Button className="mt-6 w-full" onClick={handleLogin}>
          <LogIn className="size-4" />
          立即登录
        </Button>
      </div>
    </div>
  );
};

export default LoginPrompt;
