import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export default function ReportCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-none border-t-[3px] border-t-[#0033A0] bg-white p-6 shadow-md', className)}>{children}</div>
  );
}
