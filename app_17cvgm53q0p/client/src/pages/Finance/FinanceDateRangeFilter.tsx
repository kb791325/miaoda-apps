import { useState } from 'react';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRangePreset, FinanceDateRange } from './finance-utils';
import { getPresetRange } from './finance-utils';

interface PresetConfig {
  preset: DateRangePreset;
  label: string;
}

const PRESET_OPTIONS: PresetConfig[] = [
  { preset: 'today', label: '今日' },
  { preset: 'month', label: '本月' },
  { preset: 'year', label: '本年' },
];

export interface FinanceDateRangeFilterProps {
  preset: DateRangePreset;
  range: FinanceDateRange;
  onPresetChange: (preset: DateRangePreset, range: FinanceDateRange) => void;
}

/** 财务仪表盘时间范围筛选：预设按钮组 + 自定义日期区间（Calendar range） */
const FinanceDateRangeFilter: React.FC<FinanceDateRangeFilterProps> = ({
  preset,
  range,
  onPresetChange,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handlePresetClick = (item: PresetConfig): void => {
    onPresetChange(item.preset, getPresetRange(item.preset));
  };

  const handleRangeSelect = (
    selected: { from?: Date; to?: Date } | undefined,
  ): void => {
    if (!selected?.from || !selected.to) return;
    const nextRange: FinanceDateRange = {
      startDate: dayjs(selected.from).format('YYYY-MM-DD'),
      endDate: dayjs(selected.to).format('YYYY-MM-DD'),
    };
    onPresetChange('custom', nextRange);
    setOpen(false);
  };

  const rangeLabel: string = `${range.startDate} ~ ${range.endDate}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
        {PRESET_OPTIONS.map((item: PresetConfig) => (
          <Button
            key={item.preset}
            size="sm"
            variant={preset === item.preset ? 'default' : 'ghost'}
            onClick={() => handlePresetClick(item)}
          >
            {item.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={preset === 'custom' ? 'default' : 'ghost'}
          onClick={() => setOpen(true)}
        >
          自定义
        </Button>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-9 min-w-[230px] justify-start font-normal',
              preset === 'custom' && 'border-primary/40 text-primary',
            )}
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {preset === 'custom' ? rangeLabel : '选择自定义日期区间'}
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
            onSelect={handleRangeSelect}
          />
        </PopoverContent>
      </Popover>
      {preset !== 'custom' ? (
        <span className="text-sm text-muted-foreground">{rangeLabel}</span>
      ) : null}
    </div>
  );
};

export default FinanceDateRangeFilter;
