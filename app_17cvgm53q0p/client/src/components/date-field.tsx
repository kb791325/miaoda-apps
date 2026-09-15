import type { FC } from 'react';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateFieldProps {
  value: string;
  placeholder: string;
  onSelect: (value: string) => void;
}

/** 日期选择：值格式 YYYY-MM-DD，空字符串表示未选择 */
const DateField: FC<DateFieldProps> = ({ value, placeholder, onSelect }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'h-9 w-full justify-start font-normal',
          !value && 'text-muted-foreground',
        )}
      >
        <CalendarIcon className="mr-1 size-4" />
        {value || placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={value ? dayjs(value).toDate() : undefined}
        onSelect={(date: Date | undefined) => {
          onSelect(date ? dayjs(date).format('YYYY-MM-DD') : '');
        }}
      />
    </PopoverContent>
  </Popover>
);

export default DateField;
