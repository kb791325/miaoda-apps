import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { authClient } from '@lark-apaas/client-toolkit/auth';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';
import { Smartphone, Loader2, LogOut } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectAfter = searchParams.get('redirect') || '/dashboard/workbench';
  const { isLoggedIn, isLoading } = useApp();
  const navigate = useNavigate();

  const [loginLoading, setLoginLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="flex size-20 items-center justify-center rounded-full bg-[#f0f9ff]">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="3" fill="#00D6B9" />
            <rect x="22" y="4" width="22" height="16" rx="3" fill="#3370FF" />
            <rect x="4" y="22" width="22" height="22" rx="3" fill="#3370FF" />
            <rect x="28" y="22" width="16" height="22" rx="3" fill="#00D6B9" />
          </svg>
        </div>
        <p className="mt-4 text-sm text-[#86909c]">{t('牧唐数智一体化 ERP')}</p>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to={redirectAfter} replace />;
  }

  const handleFeishuLogin = () => {
    if (!agreed) {
      setShowAgreementModal(true);
      return;
    }
    doLogin();
  };

  const handleAgreeAndLogin = () => {
    setAgreed(true);
    setShowAgreementModal(false);
    doLogin();
  };

  const handleSwitchAccount = async () => {
    setLoginLoading(true);
    try {
      await authClient.session.signOut();
    } catch (e) {
      logger.warn(`清除登录态失败: ${(e as Error)?.message}`);
    }
    try {
      const target = resolveAppUrl(redirectAfter);
      authClient.session.redirectToLogin({ returnUrl: target });
    } catch (e) {
      logger.error(`跳转登录失败: ${(e as Error)?.message}`);
      setLoginLoading(false);
    }
  };

  function doLogin() {
    setLoginLoading(true);
    try {
      const target = resolveAppUrl(redirectAfter);
      authClient.session.redirectToLogin({ returnUrl: target });
    } catch (e) {
      logger.error(`跳转登录失败: ${(e as Error)?.message}`);
    }
    setTimeout(() => {
      setLoginLoading(false);
    }, 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <Card className="w-full max-w-[380px] shadow-lg border-border/60">
        <CardContent className="px-8 py-10">
          <h1 className="text-xl font-semibold text-[#1f2329]">{t('牧唐数智一体化 ERP')}</h1>

          <div className="mt-6 flex justify-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-[#f0f9ff]">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="3" fill="#00D6B9" />
                <rect x="22" y="4" width="22" height="16" rx="3" fill="#3370FF" />
                <rect x="4" y="22" width="22" height="22" rx="3" fill="#3370FF" />
                <rect x="28" y="22" width="16" height="22" rx="3" fill="#00D6B9" />
              </svg>
            </div>
          </div>

          <p className="mt-3 text-center text-sm text-[#646a73]">{t('点击即可快速授权登录')}</p>

          <Button
            className="mt-5 h-11 w-full bg-[#1f2329] text-sm font-medium text-white hover:bg-[#2a2f3a]"
            onClick={handleFeishuLogin}
            disabled={loginLoading}
          >
            {loginLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('正在跳转...')}
              </>
            ) : (
              t('飞书登录')
            )}
          </Button>

          <div className="mt-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e5e6eb]" />
            <span className="text-xs text-[#86909c]">{t('其他方式')}</span>
            <span className="h-px flex-1 bg-[#e5e6eb]" />
          </div>

          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="h-10 w-full gap-2 border-[#e5e6eb] text-sm font-normal text-[#1f2329] hover:bg-[#f5f7fa]"
              onClick={handleSwitchAccount}
              disabled={loginLoading}
            >
              <LogOut className="size-4 text-[#3370ff]" />
              {t('切换账号')}
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full gap-2 border-[#e5e6eb] text-sm font-normal text-[#1f2329] hover:bg-[#f5f7fa]"
              disabled
            >
              <Smartphone className="size-4 text-[#3370ff]" />
              {t('手机登录')}
            </Button>
          </div>

          <div className="mt-5 flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
              className="mt-0.5 size-3.5 border-[#c9cdd4] data-[state=checked]:border-[#3370ff] data-[state=checked]:bg-[#3370ff]"
            />
            <label htmlFor="terms" className="text-xs leading-5 text-[#646a73]">
              {t('我已经阅读并且同意')}{' '}
              <span className="cursor-pointer text-[#3370ff] hover:underline">{t('服务协议')}</span>
              {' '}{t('和')}{' '}
              <span className="cursor-pointer text-[#3370ff] hover:underline">{t('隐私政策')}</span>
            </label>
          </div>

          <p className="mt-2 text-xs leading-5 text-[#86909c]">
            {t('你将访问"飞书伙伴演示环境2026"的应用，账号不存在的情况下，将自动创建账号。')}
          </p>
        </CardContent>
      </Card>

      <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
        <DialogContent className="max-w-[520px] gap-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#1D2129]">{t('提示')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm text-[#86909c]">
            <p>
              {t('请先同意')}{' '}
              <span className="text-[#4E5969]">{t('服务协议')}</span>
              {' '}{t('和')}{' '}
              <span className="text-[#4E5969]">{t('隐私政策')}</span>
            </p>
            <p>{t('你将访问"飞书伙伴演示环境2026"的应用，账号不存在的情况下，将自动创建账号。')}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#e5e6eb] text-[#4E5969]"
              onClick={() => setShowAgreementModal(false)}
            >
              {t('取消')}
            </Button>
            <Button
              className="bg-[#1D2129] text-white hover:bg-[#2a2f3a]"
              onClick={handleAgreeAndLogin}
            >
              {t('同意')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
