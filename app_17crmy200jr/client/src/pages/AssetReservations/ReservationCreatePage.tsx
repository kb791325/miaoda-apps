import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft, Package, Calendar, FileText, Search, Info } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import dayjs from 'dayjs';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Card, CardContent } from '@client/src/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Calendar as CalendarComponent } from '@client/src/components/ui/calendar';
import { cn } from '@client/src/lib/utils';
import { formatDate } from '@client/src/utils/format';

import { createReservation } from '@client/src/api/asset-reservations';
import { getAssets } from '@client/src/api/fixed-assets';
import type {
  CreateReservationRequest,
  FixedAssetItem,
} from '@shared/api.interface';

const reservationSchema = z
  .object({
    assetId: z.string().min(1, '请选择资产'),
    purpose: z.string().min(1, '请填写用途说明').max(500, '用途说明不能超过500字'),
    expectedBorrowDate: z.date({ required_error: '请选择预计借出日期' }),
    expectedReturnDate: z.date({ required_error: '请选择预计归还日期' }),
  })
  .refine((data) => data.expectedReturnDate > data.expectedBorrowDate, {
    message: '预计归还日期必须晚于预计借出日期',
    path: ['expectedReturnDate'],
  });

type ReservationFormData = z.infer<typeof reservationSchema>;

const ReservationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<FixedAssetItem[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredAssets = assets.filter((a: FixedAssetItem) => {
    if (!assetSearch.trim()) return true;
    const q = assetSearch.toLowerCase();
    return (
      a.assetName.toLowerCase().includes(q) ||
      a.assetType?.toLowerCase().includes(q)
    );
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      assetId: '',
      purpose: '',
      expectedBorrowDate: undefined,
      expectedReturnDate: undefined,
    },
  });

  useEffect(() => {
    const fetchAssets = async () => {
      setAssetsLoading(true);
      try {
        const res = await getAssets({
          assetStatus: 'in_stock',
          pageSize: 200,
        });
        setAssets(res.items);
      } catch (err: unknown) {
        logger.error('加载资产列表失败', err);
        toast.error('加载资产列表失败');
      } finally {
        setAssetsLoading(false);
      }
    };
    fetchAssets();
  }, []);

  const onSubmit = async (data: ReservationFormData) => {
    setSubmitting(true);
    try {
      const selectedAsset = assets.find((a: any) => a.id === data.assetId);
      const request: CreateReservationRequest = {
        assetId: data.assetId,
        assetName: selectedAsset?.assetName || '',
        assetCode: selectedAsset ? `FA-${selectedAsset.id.slice(-6)}` : '',
        requesterName: '',
        requesterDepartment: '',
        purpose: data.purpose,
        expectedBorrowDate: dayjs(data.expectedBorrowDate).format(
          'YYYY-MM-DD',
        ),
        expectedReturnDate: dayjs(data.expectedReturnDate).format(
          'YYYY-MM-DD',
        ),
      };
      await createReservation(request);
      toast.success('预约创建成功');
      navigate('/asset-reservations');
    } catch (err: unknown) {
      logger.error('创建预约失败', err);
      toast.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/asset-reservations')}
          className="h-8 w-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">新建预约</h1>
          <p className="text-sm text-muted-foreground mt-1">
            填写预约信息，提交资产预约申请
          </p>
        </div>
      </div>

      {/* 表单 */}
      <Card className="rounded-sm border-border bg-card">
        <CardContent className="p-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* 资产信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Package className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    资产信息
                  </h2>
                </div>

                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        选择资产 <span className="text-destructive">*</span>
                      </FormLabel>
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="搜索资产名称 / 编码 / 类型"
                          value={assetSearch}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAssetSearch(e.target.value)
                          }
                          className="pl-8 rounded-sm"
                        />
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            className={cn(
                              'rounded-sm',
                              form.formState.errors.assetId &&
                                'border-destructive',
                            )}
                          >
                            <SelectValue
                              placeholder={
                                assetsLoading
                                  ? '加载中...'
                                  : '请选择在库资产'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAssets.length === 0 ? (
                            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                              {assetSearch
                                ? '未找到匹配的资产'
                                : '暂无可选资产'}
                            </div>
                          ) : (
                            filteredAssets.map(
                              (asset: FixedAssetItem) => (
                                <SelectItem
                                  key={asset.id}
                                  value={asset.id}
                                >
                                  <span className="flex items-center gap-2">
                                    <Package className="size-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">
                                      {asset.assetName}
                                    </span>
                                    <span className="text-muted-foreground text-xs shrink-0">
                                      {asset.assetType}
                                    </span>
                                  </span>
                                </SelectItem>
                              ),
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Info className="size-3" />
                        请选择需要预约的资产（共{' '}
                        {assetsLoading ? '...' : assets.length} 个在库资产）
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 预约信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <FileText className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    预约信息
                  </h2>
                </div>

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        用途说明 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="请填写资产用途说明"
                          className={cn(
                            'rounded-sm min-h-[100px]',
                            form.formState.errors.purpose &&
                              'border-destructive',
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 借出信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Calendar className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    借出信息
                  </h2>
                </div>

                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="expectedBorrowDate"
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[180px]">
                        <FormLabel>
                          预计借出日期{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full rounded-sm justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                  form.formState.errors
                                    .expectedBorrowDate &&
                                    'border-destructive',
                                )}
                              >
                                <Calendar className="size-4 mr-2" />
                                {field.value
                                  ? formatDate(field.value)
                                  : '选择日期'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={{ before: today }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedReturnDate"
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[180px]">
                        <FormLabel>
                          预计归还日期{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full rounded-sm justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                  form.formState.errors
                                    .expectedReturnDate &&
                                    'border-destructive',
                                )}
                              >
                                <Calendar className="size-4 mr-2" />
                                {field.value
                                  ? formatDate(field.value)
                                  : '选择日期'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={{ before: today }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 提交按钮 - 粘性底部 */}
              <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-4 bg-card border-t border-border flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/asset-reservations')}
                  className="rounded-sm border-border flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground flex-[2]"
                >
                  {submitting ? '提交中...' : '提交预约'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationCreatePage;