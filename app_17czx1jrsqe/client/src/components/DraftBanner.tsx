import { format } from 'date-fns';
import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraftBannerProps {
  savedAt?: string;
  onRestore: () => void;
  onDiscard: () => void;
  className?: string;
}

export default function DraftBanner({ savedAt, onRestore, onDiscard, className }: DraftBannerProps) {
  if (!savedAt) return null;
  const timeStr = format(new Date(savedAt), 'MM-dd HH:mm');
  return (
    <div className={cn(
      'flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-800',
      className,
    )}>
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="size-4 shrink-0" />
        <span>您有 <span className="font-medium">{timeStr}</span> 保存的草稿</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-7 text-amber-800 hover:bg-amber-100 hover:text-amber-900" onClick={onRestore}>
          <RotateCcw className="mr-1 size-3.5" />
          恢复
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-amber-800 hover:bg-amber-100 hover:text-amber-900" onClick={onDiscard}>
          <Trash2 className="mr-1 size-3.5" />
          丢弃
        </Button>
      </div>
    </div>
  );
}
