import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { createProduct } from '@client/src/api/product';
import type { CreateProductRequest } from '@shared/product';
import { ProductImageUploader } from './ProductImageUploader';
import type { RecognizedProductInfo } from './ProductImageUploader';
import { extractErrorMessage } from './inventory-utils';

const productCreateSchema = z.object({
  productName: z.string().min(1, '请输入商品名称'),
  price: z.coerce
    .number({ message: '请输入销售单价' })
    .min(0, '单价不能为负数'),
  initialStock: z.coerce
    .number({ message: '请输入初始库存' })
    .int('初始库存必须是整数')
    .min(0, '初始库存不能为负数'),
});

type ProductCreateFormValues = z.infer<typeof productCreateSchema>;

const DEFAULT_FORM_VALUES: ProductCreateFormValues = {
  productName: '',
  price: 0,
  initialStock: 0,
};

export interface ProductCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** 图片识别预填充结果（从「图片识别新增」进入时传入） */
  initialRecognized?: RecognizedProductInfo | null;
  /** 图片识别阶段已上传的图片 URL */
  initialImageUrl?: string;
}

export const ProductCreateDialog: React.FC<ProductCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  initialRecognized,
  initialImageUrl,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [recognized, setRecognized] = useState<RecognizedProductInfo | null>(
    null,
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const form = useForm<ProductCreateFormValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_FORM_VALUES);
      const prefill: RecognizedProductInfo | null = initialRecognized ?? null;
      setRecognized(prefill);
      setImageUrl(initialImageUrl);
      if (prefill !== null) {
        if (prefill.productName !== '') {
          form.setValue('productName', prefill.productName);
        }
        if (prefill.price !== undefined) {
          form.setValue('price', prefill.price);
        }
      }
    }
  }, [open, form, initialRecognized, initialImageUrl]);

  const handleRecognized = (info: RecognizedProductInfo): void => {
    setRecognized(info);
    if (info.productName !== '') {
      form.setValue('productName', info.productName);
    }
  };

  const handleSubmit = async (
    data: ProductCreateFormValues,
  ): Promise<void> => {
    setSubmitting(true);
    try {
      const request: CreateProductRequest = {
        productName: data.productName.trim(),
        price: data.price,
        initialStock: data.initialStock,
      };
      const brand: string = recognized?.brand?.trim() ?? '';
      if (brand !== '') {
        request.brand = brand;
      }
      const specModel: string = recognized?.specModel?.trim() ?? '';
      if (specModel !== '') {
        request.specModel = specModel;
      }
      if (imageUrl !== undefined && imageUrl !== '') {
        request.imageUrl = imageUrl;
      }
      const res = await createProduct(request);
      toast.success(
        `已新增商品「${data.productName.trim()}」（SKU ${res.productNo}）`,
      );
      form.reset(DEFAULT_FORM_VALUES);
      setRecognized(null);
      setImageUrl(undefined);
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean): void => {
      if (!nextOpen) onClose();
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增商品</DialogTitle>
          <DialogDescription>
            上传商品图片可自动识别名称、品牌、规格型号；初始库存大于 0
            时自动记一条入库流水
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>图片识别</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductImageUploader
                  onRecognized={handleRecognized}
                  onImageChange={setImageUrl}
                  onRemoved={(): void => setRecognized(null)}
                />
                {imageUrl !== undefined && imageUrl !== '' ? (
                  <p className="mt-2 text-xs text-primary">
                    商品图片已上传，重新上传将替换
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        商品名称 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入商品名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>价格与库存</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          销售单价（元）{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="initialStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          初始库存（件）{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              SKU 编码自动生成 · 安全库存预警值默认 10 · 成本价可在创建后于商品列表中设置
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={(): void => onClose()}
              >
                取消
              </Button>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : null}
                确认新增
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
