import { NavLink } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { ROLE_LABELS } from '@/config/permissions';
import { t, useLang } from '@/lib/i18n';

export default function NoPermissionPage() {
  const { user } = useApp();
  useLang();
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : '';

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldOff className="size-8 text-destructive" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">{t('无权访问该页面')}</h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {t('您当前的角色')}
        {roleLabel ? `（${t(roleLabel)}）` : ''}
        {t('没有此模块的访问权限，请联系系统管理员开通，或返回工作台查看您权限内的内容。')}
      </p>
      <Button asChild className="mt-6">
        <NavLink to="/dashboard/workbench">
          <ArrowLeft className="size-4" />
          {t('返回工作台')}
        </NavLink>
      </Button>
    </div>
  );
}
