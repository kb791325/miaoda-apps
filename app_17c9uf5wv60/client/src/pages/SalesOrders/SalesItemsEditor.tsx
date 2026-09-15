import { useFieldArray, useFormState, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@client/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductWithInventory } from '@shared/api.interface';
import { EMPTY_SALES_ITEM } from './formSchema';
import type { OrderFormData } from './formSchema';

type SalesItemRow = OrderFormData['items'][number];

interface SalesItemsEditorProps {
  control: Control<OrderFormData>;
  productOptions: ProductWithInventory[];
  onProductSelect: (index: number, productId: string) => void;
}

export function SalesItemsEditor({
  control,
  productOptions,
  onProductSelect,
}: SalesItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems: SalesItemRow[] = useWatch({ control, name: 'items' });
  const { errors } = useFormState({ control });

  const totalAmount: number = (watchedItems ?? []).reduce(
    (sum: number, item: SalesItemRow) => {
      const qty: number = Number(item?.quantity) || 0;
      const price: number = Number(item?.unitPrice) || 0;
      return sum + qty * price;
    },
    0,
  );

  return (
    <div className="space-y-3 pl-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(EMPTY_SALES_ITEM)}
        >
          <Plus className="size-3.5" />
          添加商品
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[200px]">
                商品
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">
                数量
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-40">
                单位
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">
                单价（元）
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">
                小计（元）
              </th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index: number) => {
              const row: SalesItemRow | undefined = watchedItems?.[index];
              const product: ProductWithInventory | undefined =
                productOptions.find(
                  (p: ProductWithInventory) => p.id === row?.productId,
                );
              const ratio: number = product?.conversionRatio ?? 0;
              const isSalesUnit: boolean = Boolean(
                product?.salesUnit &&
                  ratio > 0 &&
                  row?.unit === product.salesUnit,
              );
              const qty: number = Number(row?.quantity) || 0;
              const subtotal: number = qty * (Number(row?.unitPrice) || 0);
              return (
                <tr key={field.id} className="border-b border-border/50">
                  <td className="px-3 py-2">
                    <FormField
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <Select
                            onValueChange={(val: string) => {
                              f.onChange(val);
                              onProductSelect(index, val);
                            }}
                            value={f.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择商品" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {productOptions.map((p: ProductWithInventory) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <FormField
                      control={control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="text-right font-mono"
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isSalesUnit && qty > 0 && product ? (
                      <p className="mt-1 text-right text-xs text-muted-foreground">
                        ≈ {qty * ratio} {product.baseUnit}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <FormField
                      control={control}
                      name={`items.${index}.unit`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <Select
                            value={f.value || undefined}
                            onValueChange={f.onChange}
                            disabled={!product}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择单位" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {product ? (
                                <>
                                  <SelectItem value={product.baseUnit}>
                                    {product.baseUnit}
                                  </SelectItem>
                                  {product.salesUnit && ratio > 0 ? (
                                    <SelectItem value={product.salesUnit}>
                                      {product.salesUnit}（1 {product.salesUnit}{' '}
                                      = {ratio} {product.baseUnit}）
                                    </SelectItem>
                                  ) : null}
                                </>
                              ) : null}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <FormField
                      control={control}
                      name={`items.${index}.unitPrice`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="text-right font-mono"
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    ¥{subtotal.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive/80 h-8 w-8 p-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50">
              <td
                colSpan={4}
                className="px-3 py-2.5 text-right font-medium text-muted-foreground"
              >
                合计
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-lg font-semibold text-foreground">
                ¥{totalAmount.toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {errors.items && !Array.isArray(errors.items) ? (
        <p className="text-xs text-destructive">{errors.items.message}</p>
      ) : null}
    </div>
  );
}
