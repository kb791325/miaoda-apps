import React, { useEffect } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';

interface UndoBannerProps {
  visible: boolean;
  message: string;
  undoLabel?: string;
  onUndo: () => void;
  onDismiss: () => void;
}

const UndoBanner: React.FC<UndoBannerProps> = ({
  visible,
  message,
  undoLabel = '撤销',
  onUndo,
  onDismiss,
}) => {
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-sm border border-success/30 bg-card px-4 py-2.5 shadow-lg">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        <span className="text-sm text-foreground">{message}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 gap-1.5"
          onClick={onUndo}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {undoLabel}
        </Button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default UndoBanner;
