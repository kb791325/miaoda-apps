import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import type { Product } from '@shared/product';

import { formatAmount } from './order-utils';

export interface OrderProductComboboxProps {
  /** 已选商品 id，未选为空字符串 */
  value: string;
  products: Product[];
  onChange: (productId: string) => void;
}

/** 可搜索商品选择器：按名称实时过滤，选项展示库存与单价，库存为 0 禁选 */
const OrderProductCombobox: React.FC<OrderProductComboboxProps> = ({
  value,
  products,
  onChange,
}) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>('');

  const selected: Product | undefined = products.find(
    (item: Product) => item.id === value,
  );
  const keyword: string = search.trim().toLowerCase();
  const filtered: Product[] = keyword
    ? products.filter((item: Product) =>
        item.productName.toLowerCase().includes(keyword),
      )
    : products;

  const handleSelect = (productId: string): void => {
    onChange(productId);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between border bg-background font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.productName}（库存 {selected.stock}）
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              请输入商品名称搜索
            </span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="请输入商品名称搜索"
          />
          <CommandList>
            <CommandEmpty>未找到匹配的商品</CommandEmpty>
            <CommandGroup>
              {filtered.map((product: Product) => {
                const outOfStock: boolean = product.stock <= 0;
                return (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    disabled={outOfStock}
                    onSelect={() => handleSelect(product.id)}
                    className="min-h-10"
                  >
                    <span
                      className={cn(
                        'flex-1 truncate',
                        outOfStock && 'text-muted-foreground',
                      )}
                    >
                      {product.productName}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {outOfStock
                        ? `缺货 · ${formatAmount(product.price)}`
                        : `库存 ${product.stock} · ${formatAmount(product.price)}`}
                    </span>
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        product.id === value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default OrderProductCombobox;
