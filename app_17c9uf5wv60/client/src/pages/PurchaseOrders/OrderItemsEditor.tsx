import { useFormState, useFieldArray, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@client/src/components/ui/form';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductWithInventory } from '@shared/api.interface';
import { toNumber } from './formSchema';
import type { PurchaseOrderFormData } from './formSchema';

interface OrderItemsEditorProps {
  control: Control<PurchaseOrderFormData>;
  productOptions: ProductWithInventory[];
  onProductSelect: (index: number, productId: string) => void;
}

export const OrderItemsEditor: React.FC<OrderItemsEditorProps> = ({
  control,
  productOptions,
  onProductSelect,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  const watchedItems = useWatch({ control, name: 'items' });
  const { errors } = useFormState({ control });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ productId: '', quantity: 1, unitPrice: 0, unit: '' })
          }
        >
          <Plus className="size-3.5" />
          添加明细
        </Button>
      </div>
      {fields.map((row, index: number) => {
        const product: ProductWithInventory | undefined = watchedItems?.[index]
          ? productOptions.find(
              (p: ProductWithInventory) =>
                p.id === watchedItems[index]?.productId,
            )
          : undefined;
        const subtotal: number =
          toNumber(watchedItems?.[index]?.quantity) *
          toNumber(watchedItems?.[index]?.unitPrice);
        const qtyNum: number = toNumber(watchedItems?.[index]?.quantity);
        const rowUnit: string = watchedItems?.[index]?.unit ?? '';
        const ratio: number = product?.conversionRatio ?? 0;
        const isSalesUnit: boolean = Boolean(
          product?.salesUnit && ratio > 0 && rowUnit === product.salesUnit,
        );
        return (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-4">
              <FormField
                control={control}
                name={`items.${index}.productId`}
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(val: string) => {
                        field.onChange(val);
                        onProductSelect(index, val);
                      }}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择商品" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productOptions.map((p: ProductWithInventory) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}（{p.code}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-2">
              <FormField
                control={control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="数量"
                        value={field.value as number}
                        onChange={(e) => field.onChange(toNumber(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isSalesUnit && qtyNum > 0 && product ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ {qtyNum * ratio} {product.baseUnit}
                </p>
              ) : null}
            </div>
            <div className="col-span-2">
              <FormField
                control={control}
                name={`items.${index}.unit`}
                render={({ field }) => (
                  <FormItem>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={!product}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="单位" />
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
                                {product.salesUnit}（1 {product.salesUnit} ={' '}
                                {ratio} {product.baseUnit}）
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
            </div>
            <div className="col-span-2">
              <FormField
                control={control}
                name={`items.${index}.unitPrice`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="单价"
                        value={field.value as number}
                        onChange={(e) => field.onChange(toNumber(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-1 flex items-center h-9 font-mono text-xs text-muted-foreground whitespace-nowrap">
              ¥{subtotal.toFixed(2)}
            </div>
            <div className="col-span-1 flex items-center h-9">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
      {errors.items?.message && (
        <p className="text-xs text-destructive">{errors.items.message}</p>
      )}
    </div>
  );
};
