import React from 'react';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CourseListItem } from '@shared/course';

export interface ScheduleFilters {
  courseId: string;
  status: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export const EMPTY_SCHEDULE_FILTERS: ScheduleFilters = {
  courseId: '',
  status: '',
  dateFrom: null,
  dateTo: null,
};

const STATUS_OPTIONS: string[] = ['招生中', '已开课', '已结束'];

interface ScheduleFilterBarProps {
  courses: CourseListItem[];
  filters: ScheduleFilters;
  onChange: (filters: ScheduleFilters) => void;
}

export const ScheduleFilterBar: React.FC<ScheduleFilterBarProps> = ({
  courses,
  filters,
  onChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.courseId === '' ? 'all' : filters.courseId}
        onValueChange={(value: string) =>
          onChange({ ...filters, courseId: value === 'all' ? '' : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="全部课程" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部课程</SelectItem>
          {courses.map((course: CourseListItem) => (
            <SelectItem key={course.id} value={course.id}>
              {course.courseName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status === '' ? 'all' : filters.status}
        onValueChange={(value: string) =>
          onChange({ ...filters, status: value === 'all' ? '' : value })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {STATUS_OPTIONS.map((status: string) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[150px] justify-start gap-2 text-left font-normal"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {filters.dateFrom
              ? dayjs(filters.dateFrom).format('YYYY-MM-DD')
              : '开始日期'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom ?? undefined}
            onSelect={(date: Date | undefined) =>
              onChange({ ...filters, dateFrom: date ?? null })
            }
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[150px] justify-start gap-2 text-left font-normal"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {filters.dateTo
              ? dayjs(filters.dateTo).format('YYYY-MM-DD')
              : '结束日期'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo ?? undefined}
            onSelect={(date: Date | undefined) =>
              onChange({ ...filters, dateTo: date ?? null })
            }
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        onClick={() => onChange(EMPTY_SCHEDULE_FILTERS)}
      >
        重置
      </Button>
    </div>
  );
};
