import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather, KeyRound, User, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@client/src/hooks/use-auth';
import { useAppInfo } from '@lark-apaas/client-toolkit/hooks/useAppInfo';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: string;
}

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: { message?: string; error?: ApiErrorPayload };
  };
}

const extractErrorMessage = (err: unknown): string | undefined => {
  const data = (err as AxiosLikeError)?.response?.data;
  return data?.error?.message ?? data?.message;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { appName } = useAppInfo();
  const { user, login, feishuLogin } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feishuLoading, setFeishuLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名/手机号和密码');
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success('登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      const message: string =
        extractErrorMessage(err) ?? '登录失败，请稍后重试';
      setError(message);
      logger.error(`登录失败: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeishuLogin = async () => {
    setError('');
    setFeishuLoading(true);
    try {
      await feishuLogin();
      toast.success('飞书登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      const message: string =
        extractErrorMessage(err) ?? '飞书登录失败，请稍后重试';
      setError(message);
      logger.error(`飞书登录失败: ${message}`);
    } finally {
      setFeishuLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Zap className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {appName || '家速达电器订单管理'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              电器电商运营后台 · 请使用分配的账号登录
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="login-username" className="text-base">
                  用户名 / 手机号
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名或手机号"
                    autoComplete="username"
                    className="h-12 pl-10 text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="login-password" className="text-base">
                  密码
                </Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    className="h-12 pl-10 text-base"
                  />
                </div>
              </div>
              {error ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-12 text-base"
                data-ai-section-type="button"
              >
                {submitting ? '登录中…' : '登 录'}
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground">或</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={feishuLoading}
                onClick={handleFeishuLogin}
                className="h-12 text-base w-full"
                data-ai-section-type="button"
              >
                <Feather className="size-5" />
                {feishuLoading ? '飞书登录中…' : '飞书登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          如需开通账号或忘记密码，请联系系统管理员
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
