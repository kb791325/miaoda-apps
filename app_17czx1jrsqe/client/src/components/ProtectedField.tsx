import { memo, useState } from 'react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { EyeOff } from 'lucide-react';
import { useFieldPermission, maskAmount, maskText } from '@/hooks/useFieldPermission';

interface ProtectedAmountProps {
  fieldKey: string;
  value: number | string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

function ProtectedAmountInner({ fieldKey, value, prefix = '¥', decimals = 2, className = '' }: ProtectedAmountProps) {
  const { getPermission } = useFieldPermission();
  const permission = getPermission(fieldKey);

  if (permission === 'hidden') return null;

  if (permission === 'masked') {
    const masked = maskAmount(value, prefix);
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 cursor-help tabular-nums ${className}`}>
              {masked}
              <EyeOff className="size-3 text-muted-foreground/70" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">无权限查看完整金额</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // visible
  const num = typeof value === 'number' ? value : parseFloat(String(value) || '0');
  const formatted = num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return <span className={`tabular-nums ${className}`}>{prefix}{formatted}</span>;
}

export const ProtectedAmount = memo(ProtectedAmountInner);

interface ProtectedTextProps {
  fieldKey: string;
  value: string;
  className?: string;
}

function ProtectedTextInner({ fieldKey, value, className = '' }: ProtectedTextProps) {
  const { getPermission } = useFieldPermission();
  const permission = getPermission(fieldKey);

  if (permission === 'hidden') return null;

  if (permission === 'masked') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 cursor-help ${className}`}>
              {maskText(value)}
              <EyeOff className="size-3 text-muted-foreground/70" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">无权限查看完整信息</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className={className}>{value}</span>;
}

export const ProtectedText = memo(ProtectedTextInner);

// 直接暴露工具，方便列显隐判断
export { useFieldPermission };
