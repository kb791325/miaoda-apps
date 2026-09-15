'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  Loader2Icon,
  XIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ className, style, icons, ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className={cn('toaster group', className)}
      position="top-right"
      duration={5000}
      icons={{
        success: (
          <CircleCheckIcon
            fill="currentColor"
            className="size-6 [&>:not(circle)]:stroke-(--success-text)"
          />
        ),
        info: (
          <InfoIcon
            fill="currentColor"
            className="size-6 text-info [&>:not(circle)]:stroke-(--normal-bg)"
          />
        ),
        warning: (
          <CircleAlertIcon
            fill="currentColor"
            className="size-6 text-warning [&>:not(circle)]:stroke-(--normal-bg)"
          />
        ),
        error: (
          <CircleXIcon
            fill="currentColor"
            className="size-6 [&>:not(circle)]:stroke-(--error-text)"
          />
        ),
        close: <XIcon className="size-4 text-accent-foreground" />,
        loading: <Loader2Icon className="size-6 animate-spin text-primary" />,
        ...icons,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--success-bg': '#16a34a',
          '--success-text': '#ffffff',
          '--success-border': '#16a34a',
          '--error-bg': '#ff4d4f',
          '--error-text': '#ffffff',
          '--error-border': '#ff4d4f',
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
