import React from 'react';
import dayjs from 'dayjs';
import { CalendarIcon, Download, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import HelpTip from '@client/src/components/HelpTip';
import { useAuth } from '@client/src/hooks/use-auth';

import type { Customer } from '@shared/customer';
import { ORDER_STATUS_OPTIONS } from '@shared/order';

import type { OrdersFilters } from './order-utils';

const ALL_STATUS_VALUE = 'all';
const ALL_CUSTOMER_VALUE = 'all';

export interface OrdersFilterBarProps {
  filters: OrdersFilters;
  customers: Customer[];
  exporting: boolean;
  onFiltersChange: (filters: OrdersFilters) => void;
  onCreate: () => void;
  onExport: () => void;
}

interface OrderDatePickerProps {
  value: string;
  placeholder: string;
  onSelect: (value: string) => void;
}

const OrderDatePicker: React.FC<OrderDatePickerProps> = ({
  value,
  placeholder,
  onSelect,
}) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const selectedDate: Date | undefined = value ? dayjs(value).toDate() : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-[150px] justify-start font-normal"
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date: Date | undefined) => {
            onSelect(date ? dayjs(date).format('YYYY-MM-DD') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

const OrdersFilterBar: React.FC<OrdersFilterBarProps> = ({
  filters,
  customers,
  exporting,
  onFiltersChange,
  onCreate,
  onExport,
}) => {
  const { hasPerm } = useAuth();
  const [keywordInput, setKeywordInput] = React.useState<string>(filters.keyword);

  React.useEffect(() => {
    setKeywordInput(filters.keyword);
  }, [filters.keyword]);

  // 输入防抖 300ms 后才把关键词写回筛选条件触发查询
  React.useEffect(() => {
    if (keywordInput === filters.keyword) return;
    const timer = window.setTimeout((): void => {
      onFiltersChange({ ...filters, keyword: keywordInput });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput]);

  const handleStatusChange = (value: string): void => {
    onFiltersChange({
      ...filters,
      status: value === ALL_STATUS_VALUE ? '' : value,
    });
  };

  const handleCustomerChange = (value: string): void => {
    onFiltersChange({
      ...filters,
      customerId: value === ALL_CUSTOMER_VALUE ? '' : value,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[360px]">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keywordInput}
            placeholder="搜索订单号 / 客户名 / 商品名"
            className="h-10 pl-9"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setKeywordInput(event.target.value);
            }}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" disabled={exporting} onClick={onExport}>
            <Download className="size-4" />
            {exporting ? '导出中…' : '导出 Excel'}
          </Button>
          {hasPerm('order:create') ? (
            <>
              <Button onClick={onCreate}>
                <Plus className="size-4" />
                新增订单
              </Button>
              <HelpTip content="点击后填写客户、商品和数量即可创建订单，系统会自动生成配送单" />
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.status || ALL_STATUS_VALUE}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="订单状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_VALUE}>全部状态</SelectItem>
            {ORDER_STATUS_OPTIONS.map((status: string) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.customerId || ALL_CUSTOMER_VALUE}
          onValueChange={handleCustomerChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="客户" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CUSTOMER_VALUE}>全部客户</SelectItem>
            {customers.map((customer: Customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.customerName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <OrderDatePicker
            value={filters.dateStart}
            placeholder="开始日期"
            onSelect={(value: string) =>
              onFiltersChange({ ...filters, dateStart: value })
            }
          />
          <span className="text-muted-foreground">至</span>
          <OrderDatePicker
            value={filters.dateEnd}
            placeholder="结束日期"
            onSelect={(value: string) =>
              onFiltersChange({ ...filters, dateEnd: value })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersFilterBar;
