import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Check, ChevronsUpDown, Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MODULES, type IFieldConfig } from '@/config/modules';
import type { ModuleKey } from '@/data/mt-records';
import { useModuleData } from '@/lib/data-service';
import { UserSelect } from '@lark-apaas/client-toolkit/components/User';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface GenericFormPageProps {
  moduleKey: ModuleKey;
}

interface SelectFieldProps {
  field: IFieldConfig;
  value: string;
  hasError: boolean;
  onChange: (value: string) => void;
}

/** 静态选项下拉 */
function StaticSelectField({ field, value, hasError, onChange }: SelectFieldProps) {
  const baseOptions = field.options ?? [];
  const normalizedValue = String(value).trim();
  const valueInOptions = !normalizedValue || baseOptions.some((o) => o.value === normalizedValue);
  const options = valueInOptions
    ? baseOptions
    : [...baseOptions, { value: normalizedValue, label: normalizedValue }];
  const selectKey = `${field.key}|${options.length}|${normalizedValue || '__empty__'}`;
  return (
    <Select key={selectKey} value={normalizedValue} onValueChange={onChange}>
      <SelectTrigger className={cn('w-full bg-background', hasError && 'border-destructive')}>
        <SelectValue placeholder={`请选择${field.label}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 跨模块动态选项下拉 */
function DynamicSelectField({ field, value, hasError, onChange }: SelectFieldProps) {
  const { records } = useModuleData(field.sourceModule as ModuleKey);
  const options = Array.from(
    new Set(
      records
        .map((r) => String(r.values[field.sourceField ?? 'name'] ?? ''))
        .filter((v) => v.length > 0),
    ),
  );
  const normalizedValue = String(value).trim();
  const selectKey = `${field.key}|${options.length}|${normalizedValue || '__empty__'}`;

  if (options.length === 0) {
    return <Skeleton className="h-10 w-full rounded-md" />;
  }

  return (
    <Select key={selectKey} value={normalizedValue} onValueChange={onChange}>
      <SelectTrigger className={cn('w-full bg-background', hasError && 'border-destructive')}>
        <SelectValue placeholder={`请选择${field.label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">不关联</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 多选字段 */
function MultiSelectField({ field, value, hasError, onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(',').filter(Boolean) : [];
  const baseOptions = field.options ?? [];
  const missingOptions = selected
    .filter((v) => !baseOptions.some((o) => o.value === v))
    .map((v) => ({ value: v, label: v }));
  const options = [...baseOptions, ...missingOptions];
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt];
    onChange(next.join(','));
  };
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between bg-background font-normal',
            hasError && 'border-destructive',
            selected.length === 0 && 'text-muted-foreground',
          )}
        >
          <span className="truncate">
            {selected.length > 0 ? selected.map(labelOf).join('、') : `请选择${field.label}(可多选)`}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => toggle(o.value)}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span>{o.label}</span>
                {active ? <Check className="size-4 text-primary" /> : null}
              </button>
            );
          })}
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">暂无可选项</p>
          ) : null}
        </div>
        {selected.length > 0 ? (
          <div className="mt-1 flex justify-end border-t border-border/60 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              清空
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** 附件上传组件 */
function AttachmentField({ field, value, hasError, onChange }: SelectFieldProps & { onChange: (value: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataloom = await getDataloom();
      const { data, error } = await dataloom.storage.from(getDefaultBucketId()).uploadFile(file);
      if (error || !data) throw new Error(error?.message ?? '上传失败');
      const fileInfo = { name: file.name, size: file.size, download_url: data.download_url, file_path: data.file_path };
      const existing = value ? (() => { try { return JSON.parse(value); } catch { return []; } })() : [];
      onChange(JSON.stringify([...existing, fileInfo]));
      logger.info(`附件上传成功: ${file.name}`);
    } catch (err) {
      logger.error('附件上传失败', String(err));
      toast.error('附件上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  let files: { name: string; size: number; download_url: string; file_path?: string }[] = [];
  try { files = value ? JSON.parse(value) : []; } catch { files = []; }

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? JSON.stringify(next) : '');
  };

  return (
    <div className={cn('space-y-2', hasError && 'border border-destructive rounded-md p-2')}>
      {files.length > 0 ? (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <UniversalLink
                to={f.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {f.name}
              </UniversalLink>
              <span className="shrink-0 text-xs text-muted-foreground">
                {f.size ? `${(f.size / 1024).toFixed(1)} KB` : ''}
              </span>
              <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => removeFile(i)}>
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <input ref={inputRef} type="file" onChange={handleUpload} className="hidden" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <><Loader2 className="mr-1.5 size-3.5 animate-spin" />上传中…</>
        ) : (
          <><Upload className="mr-1.5 size-3.5" />上传附件</>
        )}
      </Button>
    </div>
  );
}

export default function GenericFormPage({ moduleKey }: GenericFormPageProps) {
  const config = MODULES[moduleKey];
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { records, loading, create, update } = useModuleData(moduleKey);

  const formFields = config.fields.filter((f) => f.inForm);
  const record = isEdit ? records.find((r) => r.recordId === id) : undefined;

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const lastHydratedIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isEdit || !record) return;
    if (lastHydratedIdRef.current === record.recordId) return;
    const next: Record<string, string> = {};
    for (const field of formFields) {
      const raw = record.values[field.key];
      if (field.type === 'user') {
        const rawIds = record._userIds?.[field.key];
        if (rawIds && rawIds.length > 0) {
          next[field.key] = rawIds[0];
        } else if (raw !== undefined && raw !== null) {
          next[field.key] = String(raw);
        } else {
          next[field.key] = '';
        }
      } else if (field.type === 'checkbox') {
        if (raw === 'true' || raw === '是' || String(raw) === 'true') {
          next[field.key] = 'true';
        } else {
          next[field.key] = 'false';
        }
      } else if (field.type === 'attachment') {
        if (raw !== undefined && raw !== null) {
          next[field.key] = String(raw);
        } else {
          next[field.key] = '';
        }
      } else if (raw === undefined || raw === null) {
        next[field.key] = '';
      } else if (field.type === 'date') {
        next[field.key] = String(raw).split(' ')[0];
      } else if (field.type === 'select') {
        if (field.bitableType === 'MultiSelect') {
          if (Array.isArray(raw)) {
            const arr = (raw as unknown[]).map((v: unknown) => {
              if (typeof v === 'string') return v;
              if (typeof v === 'object' && v !== null) {
                const o = v as Record<string, unknown>;
                return String(o.text ?? o.name ?? o.value ?? '');
              }
              return String(v);
            }).filter(Boolean);
            next[field.key] = arr.join(',');
          } else {
            next[field.key] = String(raw);
          }
        } else {
          if (Array.isArray(raw)) {
            const arr = raw as unknown[];
            if (arr.length > 0) {
              const first = arr[0];
              next[field.key] = typeof first === 'string'
                ? first
                : (typeof first === 'object' && first !== null
                  ? String((first as Record<string, unknown>).text ?? (first as Record<string, unknown>).name ?? (first as Record<string, unknown>).value ?? '')
                  : String(first));
            } else {
              next[field.key] = '';
            }
          } else {
            next[field.key] = String(raw);
          }
        }
      } else if (field.type === 'number') {
        const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
        const num = Number(cleaned);
        next[field.key] = Number.isNaN(num) ? '' : String(num);
      } else {
        next[field.key] = String(raw);
      }
    }
    setValues(next);
    lastHydratedIdRef.current = record.recordId;
  }, [isEdit, record]); // eslint-disable-line react-hooks/exhaustive-deps

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = formFields.filter((f) => {
      if (!f.required) return false;
      if (f.type === 'checkbox') return false;
      return !(values[f.key] ?? '').trim();
    });
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map((f) => [f.key, true])));
      toast.error(`请填写「${missing[0].label}」`);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const payload: Record<string, string | number> = {};
      for (const field of formFields) {
        const raw = (values[field.key] ?? '').trim();
        if (field.type === 'checkbox') {
          payload[field.key] = raw === 'true' ? 'true' : 'false';
        } else if (field.type === 'number') {
          payload[field.key] = raw ? Number(raw) : 0;
        } else if (field.type === 'user') {
          payload[field.key] = raw;
        } else {
          payload[field.key] = raw === '__none__' ? '' : raw;
        }
      }
      if (isEdit && id) {
        await update(id, payload);
        toast.success(`${config.noun}已更新`);
      } else {
        await create(payload);
        toast.success(`${config.noun}已创建`);
      }
      navigate(config.route);
    } catch {
      // 数据层已 toast 错误详情
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loading && records.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  if (isEdit && !record && !loading) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">未找到该{config.noun}记录, 无法编辑</p>
          <Button variant="outline" size="sm" onClick={() => navigate(config.route)}>
            <ArrowLeft className="size-4" />
            返回列表
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(config.route)}>
        <ArrowLeft className="size-4" />
        返回{config.label}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isEdit ? `编辑${config.noun}` : `新建${config.noun}`}</CardTitle>
          <CardDescription>
            {config.bitableEnabled
              ? isEdit
                ? `修改后保存将同步更新多维表格「${config.label}」数据表`
                : `提交后将写入多维表格「${config.label}」数据表`
              : isEdit
                ? `修改后保存将同步更新「${config.tableKey}」`
                : `提交后将写入「${config.tableKey}」`}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formFields.map((field) => {
              const value = values[field.key] ?? '';
              const hasError = Boolean(errors[field.key]);
              return (
                <div key={field.key} className={cn('space-y-2', field.span === 2 && 'sm:col-span-2')}>
                  <Label htmlFor={`field-${field.key}`}>
                    {field.label}
                    {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                  </Label>
                  {field.type === 'user' ? (
                    <UserSelect
                      mode="single"
                      value={value || undefined}
                      placeholder={`请选择${field.label}`}
                      onChange={(user) => {
                        if (user && 'user_id' in user) {
                          setValue(field.key, user.user_id);
                        }
                      }}
                    />
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-3 pt-1">
                      <Switch
                        id={`field-${field.key}`}
                        checked={value === 'true'}
                        onCheckedChange={(checked) => setValue(field.key, checked ? 'true' : 'false')}
                      />
                      <Label htmlFor={`field-${field.key}`} className="cursor-pointer text-sm text-muted-foreground">
                        {value === 'true' ? '是' : '否'}
                      </Label>
                    </div>
                  ) : field.type === 'attachment' ? (
                    <AttachmentField
                      field={field}
                      value={value}
                      hasError={hasError}
                      onChange={(v) => setValue(field.key, v)}
                    />
                  ) : field.type === 'select' ? (
                    field.bitableType === 'MultiSelect' ? (
                      <MultiSelectField
                        field={field}
                        value={value}
                        hasError={hasError}
                        onChange={(v) => setValue(field.key, v)}
                      />
                    ) : field.sourceModule ? (
                      <DynamicSelectField
                        field={field}
                        value={value}
                        hasError={hasError}
                        onChange={(v) => setValue(field.key, v)}
                      />
                    ) : (
                      <StaticSelectField
                        field={field}
                        value={value}
                        hasError={hasError}
                        onChange={(v) => setValue(field.key, v)}
                      />
                    )
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={`field-${field.key}`}
                      value={value}
                      onChange={(e) => setValue(field.key, e.target.value)}
                      placeholder={field.placeholder ?? `请输入${field.label}`}
                      className={cn('bg-background', hasError && 'border-destructive')}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={`field-${field.key}`}
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={value}
                      onChange={(e) => setValue(field.key, e.target.value)}
                      placeholder={field.placeholder ?? `请输入${field.label}`}
                      min={field.type === 'number' ? 0 : undefined}
                      step={field.type === 'number' ? '0.01' : undefined}
                      className={cn('bg-background', hasError && 'border-destructive')}
                    />
                  )}
                  {hasError ? <p className="text-xs text-destructive">此项为必填</p> : null}
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="gap-3 border-t border-border/60 px-6 py-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中…' : isEdit ? '保存修改' : '提交创建'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(config.route)} disabled={submitting}>
              取消
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}