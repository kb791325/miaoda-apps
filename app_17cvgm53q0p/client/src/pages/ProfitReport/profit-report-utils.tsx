import { useState } from 'react';
import dayjs from 'dayjs';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarIcon } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { cn } from '@/lib/utils';
import { exportExcel } from '@client/src/api/finance';
import type { FinanceExportType, FinanceGroupBy } from '@shared/finance';
import type { FinanceDateRange } from '@client/src/pages/Finance/finance-utils';

const EXPORT_TYPE_LABELS: Record<FinanceExportType, string> = {
  timeline: '按时间统计',
  product: '按商品统计',
  customer: '按客户统计',
};

/** 从 content-disposition 解析文件名（优先 filename*=UTF-8'' 编码形式） */
function parseContentDisposition(disposition: string | undefined): string {
  if (!disposition) return '';
  const encodedMatch: RegExpMatchArray | null = disposition.match(
    /filename\*=(?:UTF-8'')?([^;]+)/iu,
  );
  if (encodedMatch) {
    try {
      return decodeURIComponent(encodedMatch[1].trim());
    } catch {
      return encodedMatch[1].trim();
    }
  }
  const plainMatch: RegExpMatchArray | null = disposition.match(
    /filename="?([^";]+)"?/iu,
  );
  if (plainMatch) {
    try {
      return decodeURIComponent(plainMatch[1].trim());
    } catch {
      return plainMatch[1].trim();
    }
  }
  return '';
}

/** 触发浏览器下载（临时 a 标签 + Object URL） */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url: string = URL.createObjectURL(blob);
  const anchor: HTMLAnchorElement = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** 调用导出接口并下载；失败时抛出可读错误信息 */
export async function downloadFinanceExcel(params: {
  type: FinanceExportType;
  startDate: string;
  endDate: string;
  groupBy?: FinanceGroupBy;
}): Promise<void> {
  const res = await exportExcel(params);
  const headerValue: string | undefined =
    res.headers?.['content-disposition'] ?? '';
  const filename: string =
    parseContentDisposition(headerValue) ||
    `利润报表-${EXPORT_TYPE_LABELS[params.type]}-${dayjs().format('YYYYMMDD')}.xlsx`;
  triggerBlobDownload(res.data, filename);
}

/** 从后端错误对象提取可读消息 */
export function extractReportErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '导出失败，请稍后重试';
}

export interface ReportDateRangePickerProps {
  range: FinanceDateRange;
  onRangeChange: (range: FinanceDateRange) => void;
}

/** 报表日期区间选择（Calendar range 双日期） */
export const ReportDateRangePicker: React.FC<ReportDateRangePickerProps> = ({
  range,
  onRangeChange,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleSelect = (
    selected: { from?: Date; to?: Date } | undefined,
  ): void => {
    if (!selected?.from || !selected.to) return;
    onRangeChange({
      startDate: dayjs(selected.from).format('YYYY-MM-DD'),
      endDate: dayjs(selected.to).format('YYYY-MM-DD'),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 min-w-[240px] justify-start font-normal">
          <CalendarIcon className="size-4 text-muted-foreground" />
          {`${range.startDate} ~ ${range.endDate}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={{
            from: dayjs(range.startDate).toDate(),
            to: dayjs(range.endDate).toDate(),
          }}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
};

export type SortDirection = 'asc' | 'desc';

export interface SortHeaderButtonProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}

/** 可排序列头按钮：点击切换排序方向，箭头指示当前方向 */
export const SortHeaderButton: React.FC<SortHeaderButtonProps> = ({
  label,
  active,
  direction,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 opacity-60" />
      )}
    </button>
  );
};
