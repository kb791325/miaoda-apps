import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Columns,
  Download,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
import { cn } from '@/lib/utils';
import { MODULES, type IFieldConfig, type IRowAction, type IToolbarAction } from '@/config/modules';
import type { IBizRecord, ModuleKey } from '@/data/mt-records';
import { useModuleData } from '@/lib/data-service';
import { formatMoney, formatMonth, formatFieldValue, formatFieldValueDisplay, formatDisplayValue, optionMeta, isPersonField } from '@/lib/format';
import { maskField, shouldHighlight, highlightClassName } from '@/lib/mask';
import { formatUserName } from '@/lib/user-names';

interface GenericListPageProps {
  moduleKey: ModuleKey;
}

type ConfirmState =
  | { kind: 'action'; action: IRowAction; record: IBizRecord }
  | { kind: 'toolbarAction'; action: IToolbarAction }
  | { kind: 'delete'; record: IBizRecord }
  | { kind: 'batchDelete' }
  | null;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const SYSTEM_AUDIT_LABELS = new Set(['创建人', '创建时间', '修改人', '修改时间']);

function isSystemAuditField(field: IFieldConfig): boolean {
  return SYSTEM_AUDIT_LABELS.has(field.bitableField ?? '') || SYSTEM_AUDIT_LABELS.has(field.label);
}

function isAutoNumberField(field: IFieldConfig): boolean {
  return field.label.includes('编号');
}

function getOrderedFields(fields: IFieldConfig[], searchField: string): IFieldConfig[] {
  const autoNumbers: IFieldConfig[] = [];
  const nameFields: IFieldConfig[] = [];
  const businessFields: IFieldConfig[] = [];
  const auditFields: IFieldConfig[] = [];

  for (const field of fields) {
    if (isSystemAuditField(field)) {
      auditFields.push(field);
    } else if (isAutoNumberField(field)) {
      autoNumbers.push(field);
    } else if (field.key === searchField) {
      nameFields.push(field);
    } else {
      businessFields.push(field);
    }
  }

  return [...autoNumbers, ...nameFields, ...businessFields, ...auditFields];
}

function actionVisible(action: IRowAction, record: IBizRecord): boolean {
  if (
    action.visibleWhenIn &&
    !action.visibleWhenIn.values.includes(String(record.values[action.visibleWhenIn.field] ?? ''))
  ) {
    return false;
  }
  if (
    action.visibleWhenEquals &&
    String(record.values[action.visibleWhenEquals.field] ?? '') !== action.visibleWhenEquals.value
  ) {
    return false;
  }
  if (
    action.hiddenWhenIn &&
    action.hiddenWhenIn.values.includes(String(record.values[action.hiddenWhenIn.field] ?? ''))
  ) {
    return false;
  }
  if (
    action.hiddenWhenEquals &&
    String(record.values[action.hiddenWhenEquals.field] ?? '') === action.hiddenWhenEquals.value
  ) {
    return false;
  }
  return true;
}

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GenericListPage({ moduleKey }: GenericListPageProps) {
  const config = MODULES[moduleKey];
  const navigate = useNavigate();
  const { records, loading, error, reload, update, removeMany } = useModuleData(moduleKey);
  const [keyword, setKeyword] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [extraFilter, setExtraFilter] = useState('all');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const allOrderedFields = useMemo(
    () => getOrderedFields(config.fields, config.searchField),
    [config],
  );

  const initialHidden = useMemo(
    () => new Set(allOrderedFields.filter((f) => isSystemAuditField(f)).map((f) => f.key)),
    [allOrderedFields],
  );

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(initialHidden);

  useEffect(() => {
    setHiddenColumns(initialHidden);
  }, [initialHidden]);

  const visibleFields = useMemo(
    () => allOrderedFields.filter((f) => !hiddenColumns.has(f.key)),
    [allOrderedFields, hiddenColumns],
  );

  const filterField = useMemo(
    () => (config.filterField ? config.fields.find((f) => f.key === config.filterField) : undefined),
    [config],
  );
  const extraField = useMemo(
    () => (config.extraFilterField ? config.fields.find((f) => f.key === config.extraFilterField) : undefined),
    [config],
  );
  const maskFieldKeys = useMemo(() => new Set(config.maskFields ?? []), [config.maskFields]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return records.filter((r) => {
      if (kw && !String(r.values[config.searchField] ?? '').toLowerCase().includes(kw)) return false;
      if (filterField && statusTab !== 'all' && String(r.values[filterField.key] ?? '') !== statusTab) return false;
      if (extraField && extraFilter !== 'all' && String(r.values[extraField.key] ?? '') !== extraFilter) return false;
      return true;
    });
  }, [records, keyword, filterField, statusTab, extraField, extraFilter, config]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [keyword, statusTab, extraFilter, pageSize, moduleKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const pageIds = useMemo(() => paged.map((r) => r.recordId), [paged]);
  const selectedOnPage = pageIds.filter((id) => selected.has(id));
  const allPageChecked = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageChecked = selectedOnPage.length > 0 && !allPageChecked;

  const visibleToolbarActions = useMemo(() => {
    if (!config.toolbarActions) return [];
    return config.toolbarActions.filter((a) => {
      if (a.visibleWhenTab && statusTab !== a.visibleWhenTab) return false;
      return true;
    });
  }, [config.toolbarActions, statusTab]);

  const financeSummary = useMemo(() => {
    if (!config.financeSummary) return null;
    const income = records
      .filter((r) => r.values.type === 'income')
      .reduce((sum, r) => sum + Number(r.values.amount ?? 0), 0);
    const expense = records
      .filter((r) => r.values.type === 'expense')
      .reduce((sum, r) => sum + Number(r.values.amount ?? 0), 0);
    return { income, expense, net: income - expense };
  }, [config.financeSummary, records]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const togglePageAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
      toast.success('数据已刷新');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('当前没有可导出的数据');
      return;
    }
    const headers = visibleFields.map((f) => f.label);
    const rows = filtered.map((r) => visibleFields.map((f) => String(r.values[f.key] ?? '')));
    exportCsv(`${config.label}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast.success(`已导出 ${filtered.length} 条${config.noun}记录`);
  };

  const handleToolbarAction = (action: IToolbarAction) => {
    if (action.navigateTo) {
      navigate(action.navigateTo);
      return;
    }
    if (action.exportCsv) {
      handleExport();
      return;
    }
    if (action.requiresSelection && selected.size === 0) {
      toast.error('请先选择至少一条记录');
      return;
    }
    setConfirm({ kind: 'toolbarAction', action });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'action') {
        await update(confirm.record.recordId, confirm.action.patch);
        toast.success(confirm.action.successMessage);
      } else if (confirm.kind === 'toolbarAction') {
        const ta = confirm.action;
        if (ta.batchPatch && ta.requiresSelection) {
          const ids = Array.from(selected);
          await Promise.all(ids.map((id) => update(id, ta.batchPatch!)));
          toast.success(ta.successMessage ?? `已批量处理 ${ids.length} 条记录`);
          clearSelection();
        } else if (ta.batchPatch) {
          const ids = filtered.map((r) => r.recordId);
          await Promise.all(ids.map((id) => update(id, ta.batchPatch!)));
          toast.success(ta.successMessage ?? `已处理 ${ids.length} 条记录`);
        }
      } else if (confirm.kind === 'delete') {
        await removeMany([confirm.record.recordId]);
        toast.success(`${config.noun}已删除`);
      } else if (confirm.kind === 'batchDelete') {
        const ids = Array.from(selected);
        await removeMany(ids);
        toast.success(`已删除 ${ids.length} 条${config.noun}记录`);
        clearSelection();
      }
    } catch {
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const renderMultiSelect = (field: IFieldConfig, raw: unknown) => {
    if (raw === undefined || raw === null || raw === '') {
      return <span className="text-muted-foreground">—</span>;
    }
    let items: string[];
    if (Array.isArray(raw)) {
      items = raw.map((v) => String(v));
    } else {
      items = String(raw).split(/, ?/).filter(Boolean);
    }
    if (items.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => {
          const meta = optionMeta(field, item);
          return (
            <Badge key={idx} variant="outline" className={cn('text-xs', meta.className)}>
              {meta.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  const renderCell = (field: IFieldConfig, record: IBizRecord, isPrimary: boolean) => {
    const raw = record.values[field.key];
    const needMask = maskFieldKeys.has(field.key);
    const highlight = shouldHighlight(field.key, raw, record.values);

    if (field.bitableType === 'MultiSelect') {
      return renderMultiSelect(field, raw);
    }

    if (field.type === 'select') {
      if (raw === undefined || raw === null || raw === '') {
        return <span className="text-muted-foreground">—</span>;
      }
      const meta = optionMeta(field, raw);
      return <Badge variant="outline" className={cn('text-xs', meta.className, highlightClassName(highlight))}>{meta.label}</Badge>;
    }
    if (field.money) {
      return (
        <span className={cn('font-medium tabular-nums', highlightClassName(highlight))}>
          {formatMoney(raw)}
        </span>
      );
    }
    if (field.percent || field.type === 'percent') {
      return (
        <span className={cn('font-medium tabular-nums', highlightClassName(highlight))}>
          {formatFieldValueDisplay(field, raw)}
        </span>
      );
    }
    const text = raw === undefined || raw === null || raw === '' ? '—' : String(raw);
    const displayText = needMask ? maskField(field.key, raw) : text;
    const finalText = needMask
      ? displayText
      : (field.monthOnly ? formatMonth(raw) : (isPersonField(field.key) ? formatUserName(raw) : formatDisplayValue(raw)));

    if (isPrimary) {
      return (
        <Link
          to={`${config.route}/${record.recordId}`}
          className={cn('font-medium text-primary hover:underline', highlightClassName(highlight))}
        >
          <span className="block max-w-[220px] truncate">{finalText}</span>
        </Link>
      );
    }
    return (
      <span
        className={cn('block max-w-[200px] truncate', highlightClassName(highlight))}
        title={finalText}
      >
        {finalText}
      </span>
    );
  };

  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const cur = safePage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const arr: number[] = [1];
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    if (start > 2) arr.push(-1);
    for (let i = start; i <= end; i += 1) arr.push(i);
    if (end < total - 1) arr.push(-1);
    arr.push(total);
    return arr;
  }, [totalPages, safePage]);

  const confirmTitle = useMemo(() => {
    if (!confirm) return '';
    if (confirm.kind === 'action') return confirm.action.confirmTitle;
    if (confirm.kind === 'toolbarAction') return confirm.action.confirmTitle ?? '批量操作';
    if (confirm.kind === 'batchDelete') return `批量删除 ${selected.size} 条${config.noun}`;
    return `删除${config.noun}`;
  }, [confirm, selected.size, config.noun]);

  const confirmDescription = useMemo(() => {
    if (!confirm) return '';
    if (confirm.kind === 'action') return confirm.action.confirmDescription;
    if (confirm.kind === 'toolbarAction') {
      const ta = confirm.action;
      if (ta.requiresSelection) return ta.confirmDescription ?? `确认对选中的 ${selected.size} 条记录执行「${ta.label}」?`;
      return ta.confirmDescription ?? `确认执行「${ta.label}」?`;
    }
    if (confirm.kind === 'batchDelete') return `确认删除选中的 ${selected.size} 条记录? 删除后将同步从多维表格移除, 且不可恢复。`;
    return `确认删除「${confirm.kind === 'delete' ? String(confirm.record.values[visibleFields[0]?.key ?? config.searchField] ?? '') : ''}」? 删除后将同步从多维表格移除, 且不可恢复。`;
  }, [confirm, selected.size, config.noun, visibleFields, config.searchField]);

  const toggleColumn = (key: string, show: boolean) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (show) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllColumns = (show: boolean) => {
    if (show) {
      setHiddenColumns(new Set());
    } else {
      setHiddenColumns(new Set(allOrderedFields.map((f) => f.key)));
    }
  };

  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{config.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>
        <Button onClick={() => navigate(`${config.route}/new`)}>
          <Plus className="size-4" />
          新建{config.noun}
        </Button>
      </div>

      {financeSummary && !loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: '收入合计', value: formatMoney(financeSummary.income), icon: TrendingUp, className: 'text-success' },
            { label: '支出合计', value: formatMoney(financeSummary.expense), icon: TrendingDown, className: 'text-destructive' },
            { label: '净额', value: formatMoney(financeSummary.net), icon: Wallet, className: 'text-primary' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="py-4">
                <CardContent className="flex items-center gap-3 px-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className={cn('size-4', item.className)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={cn('text-lg font-semibold tabular-nums', item.className)}>{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={`搜索${config.noun}${filterField ? ' / 按状态筛选' : ''}`}
                className="bg-background pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {extraField?.options ? (
                <Select value={extraFilter} onValueChange={setExtraFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={`${extraField.label}筛选`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部{extraField.label}</SelectItem>
                    {extraField.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
                <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
                刷新
              </Button>
              {visibleToolbarActions.map((ta) => (
                <Button
                  key={ta.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleToolbarAction(ta)}
                >
                  {ta.label}
                </Button>
              ))}
              <Popover open={columnPopoverOpen} onOpenChange={setColumnPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="size-4" />
                    列设置
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">列显隐</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleAllColumns(true)}>全选</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleAllColumns(false)}>全隐</Button>
                    </div>
                  </div>
                  <div className="max-h-64 space-y-0.5 overflow-y-auto">
                    {allOrderedFields.map((field) => {
                      const visible = !hiddenColumns.has(field.key);
                      return (
                        <label
                          key={field.key}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <Checkbox
                            checked={visible}
                            onCheckedChange={(v) => toggleColumn(field.key, v === true)}
                          />
                          <span className="truncate">{field.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="size-4" />
                导出
              </Button>
            </div>
          </div>

          {filterField?.options ? (
            <Tabs value={statusTab} onValueChange={setStatusTab}>
              <TabsList className="h-auto w-full flex-wrap justify-start">
                <TabsTrigger value="all">全部</TabsTrigger>
                {filterField.options.map((o) => (
                  <TabsTrigger key={o.value} value={o.value}>
                    {o.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm font-medium text-primary">已选 {selected.size} 项</span>
              {visibleToolbarActions
                .filter((ta) => ta.requiresSelection)
                .map((ta) => (
                  <Button
                    key={ta.key}
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToolbarAction(ta)}
                  >
                    {ta.label}
                  </Button>
                ))}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirm({ kind: 'batchDelete' })}
              >
                <Trash2 className="size-4" />
                批量删除
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="size-4" />
                取消选择
              </Button>
            </div>
          ) : null}

          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">加载失败，请重试</p>
              <Button variant="outline" size="sm" onClick={() => void reload()}>
                <RotateCcw className="size-4" />
                重试
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Inbox className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {records.length === 0 ? `暂无${config.noun}记录` : '没有符合筛选条件的记录'}
              </p>
              {records.length === 0 ? (
                <Button size="sm" onClick={() => navigate(`${config.route}/new`)}>
                  <Plus className="size-4" />
                  新建{config.noun}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 w-10 bg-card">
                      <Checkbox
                        checked={somePageChecked ? 'indeterminate' : allPageChecked}
                        onCheckedChange={(v) => togglePageAll(v === true)}
                        aria-label="全选本页"
                      />
                    </TableHead>
                    {visibleFields.map((field, idx) => (
                      <TableHead
                        key={field.key}
                        className={cn(
                          'whitespace-nowrap',
                          idx === 0 && 'sticky left-10 z-10 bg-card',
                        )}
                        style={idx === 0 ? { left: '2.5rem' } : undefined}
                      >
                        {field.label}
                      </TableHead>
                    ))}
                    <TableHead className="sticky right-0 z-10 whitespace-nowrap bg-card text-right">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((record) => (
                    <TableRow key={record.recordId} data-state={selected.has(record.recordId) ? 'selected' : undefined}>
                      <TableCell className="sticky left-0 z-10 bg-card">
                        <Checkbox
                          checked={selected.has(record.recordId)}
                          onCheckedChange={(v) => toggleOne(record.recordId, v === true)}
                          aria-label="选择该行"
                        />
                      </TableCell>
                      {visibleFields.map((field, idx) => (
                        <TableCell
                          key={field.key}
                          className={cn(
                            field.money && 'tabular-nums',
                            idx === 0 && 'sticky left-10 z-10 bg-card',
                          )}
                          style={idx === 0 ? { left: '2.5rem' } : undefined}
                        >
                          {renderCell(field, record, idx === 0)}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 z-10 whitespace-nowrap bg-card text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (record.recordId) navigate(`${config.route}/${record.recordId}`);
                          }}
                        >
                          查看
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (record.recordId) navigate(`${config.route}/${record.recordId}/edit`);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          编辑
                        </Button>
                        {config.rowActions
                          ?.filter((action) => actionVisible(action, record))
                          .map((action) => (
                            <Button
                              key={action.key}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary"
                              disabled={busy}
                              onClick={() => setConfirm({ kind: 'action', action, record })}
                            >
                              {action.label}
                            </Button>
                          ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: 'delete', record })}
                        >
                          <Trash2 className="size-3.5" />
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filtered.length > 0 ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs text-muted-foreground">
                共 {records.length} 条{filtered.length !== records.length ? ` · 筛选后 ${filtered.length} 条` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">每页</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[72px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 ? (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                          className={cn(safePage === 1 && 'pointer-events-none opacity-40')}
                        />
                      </PaginationItem>
                      {pageNumbers.map((n, idx) =>
                        n === -1 ? (
                          <PaginationItem key={`e-${idx}`}>
                            <span className="px-2 text-muted-foreground">…</span>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={n}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(n);
                              }}
                              isActive={n === safePage}
                            >
                              {n}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.min(totalPages, p + 1));
                          }}
                          className={cn(safePage === totalPages && 'pointer-events-none opacity-40')}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={cn(
                confirm?.kind !== 'action' && confirm?.kind !== 'toolbarAction' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              onClick={(e) => {
                e.preventDefault();
                void runConfirm();
              }}
            >
              {busy ? '处理中…' : '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}