import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { CalendarIcon, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import DraftBanner from '@/components/DraftBanner';
import { useFormDraft } from '@/hooks/useFormDraft';
import { toast } from 'sonner';

/** 表单字段配置 */
export interface FormFieldDef {
  key: string;
  label: string;
  type?: 'input' | 'textarea' | 'select' | 'number' | 'date' | 'datetime';
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  /** textarea 是否占整行 */
  fullWidth?: boolean;
  defaultValue?: string | number;
}

interface FieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormFieldDef[];
  initialValues?: Record<string, any> | null;
  submitLabel?: string;
  /** 提交回调，返回 true 表示成功（自动关闭弹窗） */
  onSubmit: (values: Record<string, unknown>) => Promise<boolean>;
  /** 草稿配置 */
  draft?: {
    formType: string;
    businessId?: string;
    summaryField?: string; // 用于摘要的字段key
  };
  /** 提交前确认配置 */
  confirmSubmit?: {
    /** 提取金额字段，用于判断是否弹确认（金额>=10000时强制弹） */
    amountField?: string;
    /** 固定摘要字段 */
    summaryFields?: { key: string; label: string }[];
    /** 自定义确认标题 */
    title?: string;
  };
  /** 字段值变更回调（用于联动，如模板选择自动填充字段） */
  onValuesChange?: (values: Record<string, unknown>, changedKey: string) => void;
  /** 自定义内容（插入在表单字段与底部按钮之间） */
  children?: React.ReactNode;
}

const DATE_FORMAT = 'yyyy-MM-dd';
const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm';

function formatDateValue(date: Date | undefined, type: 'date' | 'datetime'): string {
  if (!date) return '';
  return format(date, type === 'datetime' ? DATETIME_FORMAT : DATE_FORMAT);
}

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

/** 根据字段配置动态构建 zod schema */
function buildSchema(fields: FormFieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((f) => {
    if (f.type === 'number') {
      shape[f.key] = z.coerce
        .number({ message: `请输入有效的${f.label}` })
        .min(0, `${f.label}不能为负数`);
    } else if (f.type === 'date' || f.type === 'datetime') {
      if (f.required) {
        shape[f.key] = z.string().min(1, `${f.label}不能为空`);
      } else {
        shape[f.key] = z.string().optional().default('');
      }
    } else if (f.required) {
      shape[f.key] = z.string().min(1, `${f.label}不能为空`);
    } else {
      shape[f.key] = z.string().optional().default('');
    }
  });
  return z.object(shape);
}

/**
 * 通用配置驱动表单弹窗：支持新建（无 initialValues）与编辑（有 initialValues）两种模式
 * 内置：草稿自动保存 + 保存草稿按钮 + 提交前确认
 */
export default function FieldFormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues,
  submitLabel = '提交',
  onSubmit,
  draft,
  confirmSubmit,
  onValuesChange,
  children,
}: FieldFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<Record<string, unknown> | null>(null);

  const schema = useMemo(() => buildSchema(fields), [fields]);

  const defaultValues = useMemo(() => {
    const v: Record<string, unknown> = {};
    fields.forEach((f) => {
      const init = initialValues?.[f.key];
      if (init !== undefined && init !== null && init !== '') {
        v[f.key] = f.type === 'number' ? Number(init) : String(init);
      } else {
        v[f.key] = f.defaultValue ?? (f.type === 'number' ? 0 : '');
      }
    });
    return v;
  }, [fields, initialValues]);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // 草稿逻辑
  const isEdit = !!initialValues;
  const draftHook = useFormDraft(
    draft?.formType ?? '__none__',
    draft?.businessId ?? 'new',
    {
      getSummary: (values) => {
        if (!draft?.summaryField) return '';
        const v = values[draft.summaryField];
        return v ? String(v) : '';
      },
    },
  );

  // 实时监听表单值，自动保存草稿（仅新建模式）+ 字段联动回调
  const watched = useWatch({ control: form.control });
  const prevWatchedRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    if (!open) return;
    // 触发 onValuesChange
    if (onValuesChange) {
      const prev = prevWatchedRef.current;
      const keys = Object.keys(watched);
      for (const k of keys) {
        if (watched[k] !== prev[k]) {
          onValuesChange(watched as Record<string, unknown>, k);
          break;
        }
      }
      prevWatchedRef.current = { ...watched };
    }
    if (!draft || isEdit) return;
    // 至少有一个必填字段有值才保存
    const hasContent = fields.some((f) => f.required && watched[f.key]);
    if (!hasContent) return;
    draftHook.scheduleAutoSave(watched as Record<string, any>);
  }, [watched, open, draft, isEdit, fields, draftHook.scheduleAutoSave, onValuesChange]);

  // 每次打开时重置表单（新建清空 / 编辑回填）
  useEffect(() => {
    if (open) {
      if (!isEdit && draftHook.draft) {
        // 有草稿时先不清空，等用户点恢复或丢弃
        return;
      }
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form, isEdit, draftHook.draft]);

  const doSubmit = useCallback(async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit(values);
      if (ok) {
        // 提交成功，清除草稿
        if (draft && !isEdit) {
          draftHook.clearDraft();
        }
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, onOpenChange, draft, isEdit, draftHook]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    // 判断是否需要确认
    if (confirmSubmit) {
      let needConfirm = false;
      if (confirmSubmit.amountField) {
        const amt = Number(values[confirmSubmit.amountField]);
        if (!isNaN(amt) && amt >= 10000) needConfirm = true;
      }
      if (needConfirm) {
        setPendingValues(values);
        setConfirmOpen(true);
        return;
      }
    }
    await doSubmit(values);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingValues) return;
    setConfirmOpen(false);
    await doSubmit(pendingValues);
    setPendingValues(null);
  };

  const handleRestore = () => {
    if (!draftHook.draft) return;
    form.reset(draftHook.draft.data);
    toast.success('已恢复草稿');
  };

  const handleDiscard = () => {
    draftHook.clearDraft();
    form.reset(defaultValues);
    toast.info('已丢弃草稿');
  };

  const handleSaveDraft = () => {
    const values = form.getValues();
    draftHook.saveDraft(values as Record<string, any>);
    toast.success('草稿已保存');
  };

  // 编辑模式无草稿提示
  const showDraftBanner = open && draft && !isEdit && draftHook.hasDraft;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {showDraftBanner && (
            <DraftBanner
              savedAt={draftHook.draft?.savedAt}
              onRestore={handleRestore}
              onDiscard={handleDiscard}
            />
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((f) => (
                  <FormField
                    key={f.key}
                    control={form.control}
                    name={f.key}
                    render={({ field }) => (
                      <FormItem className={f.type === 'textarea' || f.fullWidth ? 'sm:col-span-2' : ''}>
                        <FormLabel>
                          {f.label}
                          {f.required && <span className="ml-0.5 text-destructive">*</span>}
                        </FormLabel>
                        <FormControl>
                          {f.type === 'textarea' ? (
                            <Textarea
                              placeholder={f.placeholder || `请输入${f.label}`}
                              rows={3}
                              {...field}
                              value={String(field.value ?? '')}
                            />
                          ) : f.type === 'select' ? (
                            <Select onValueChange={field.onChange} value={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={f.placeholder || `请选择${f.label}`} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(f.options || []).map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                           ) : f.type === 'number' ? (
                             <Input
                               type="number"
                               placeholder={f.placeholder || `请输入${f.label}`}
                               {...field}
                               value={field.value === '' ? '' : String(field.value ?? '')}
                               onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                             />
                           ) : f.type === 'date' || f.type === 'datetime' ? (
                             <Popover>
                               <PopoverTrigger asChild>
                                 <Button
                                   type="button"
                                   variant="outline"
                                   className={cn(
                                     'w-full justify-start text-left font-normal pl-3',
                                     !field.value && 'text-muted-foreground',
                                   )}
                                 >
                                   <CalendarIcon className="mr-2 size-4" />
                                   {String(field.value || '') || (f.placeholder || `请选择${f.label}`)}
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0" align="start">
                                 <Calendar
                                   mode="single"
                                   selected={parseDateValue(String(field.value || '')) || undefined}
                                   onSelect={(d) => {
                                     if (d) {
                                       field.onChange(formatDateValue(d, f.type as 'date' | 'datetime'));
                                     } else {
                                       field.onChange('');
                                     }
                                   }}
                                   initialFocus
                                 />
                               </PopoverContent>
                             </Popover>
                           ) : (
                            <Input
                              placeholder={f.placeholder || `请输入${f.label}`}
                              {...field}
                              value={String(field.value ?? '')}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {children}
              <DialogFooter className="pt-2 gap-2">
                {draft && !isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="mr-auto"
                  >
                    <Save className="mr-1.5 size-3.5" />
                    保存草稿
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitting ? '提交中...' : submitLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 提交确认弹窗 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmSubmit?.title || '确认提交'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">请确认以下信息无误后提交：</p>
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  {confirmSubmit?.summaryFields?.map((sf) => (
                    <div key={sf.key} className="flex justify-between py-1">
                      <span className="text-muted-foreground">{sf.label}</span>
                      <span className="font-medium text-foreground">
                        {String(pendingValues?.[sf.key] ?? '-')}
                      </span>
                    </div>
                  ))}
                  {confirmSubmit?.amountField && pendingValues && (
                    <div className="flex justify-between border-t pt-2 mt-1">
                      <span className="text-muted-foreground">金额</span>
                      <span className="font-semibold text-primary">
                        ¥{Number(pendingValues[confirmSubmit.amountField] || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>确认提交</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
