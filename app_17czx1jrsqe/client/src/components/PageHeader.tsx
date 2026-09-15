import { cn } from '@/lib/utils';
import { t, useLang } from '@/lib/i18n';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  useLang();
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t(title)}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{t(description)}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
