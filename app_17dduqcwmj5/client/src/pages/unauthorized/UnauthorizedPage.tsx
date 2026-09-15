import { Link } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { authClient } from '@lark-apaas/client-toolkit/auth';
import { Button } from '@client/src/components/ui/button';
import { useLoginState } from '@client/src/hooks/use-login-state';

const UnauthorizedPage = () => {
  const loginState = useLoginState();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-7 text-destructive" />
      </div>
      <h2 className="text-lg font-bold text-foreground">暂无访问权限</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        您当前的角色无法访问该页面，如需权限请联系校长/管理员在角色面板中为您分配。
      </p>
      {loginState === 'anonymous' ? (
        <Button onClick={() => authClient.session.redirectToLogin()}>
          <LogIn className="size-4" />
          去登录
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link to="/consultation">返回可访问页面</Link>
        </Button>
      )}
    </div>
  );
};

export default UnauthorizedPage;
