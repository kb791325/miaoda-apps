import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { scopedStorage } from '@lark-apaas/client-toolkit';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Settings2,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Download,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { BatchActionBar } from '@/components/BatchActionBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportCSV } from '@/lib/export';
import { t, useLang } from '@/lib/i18n';
import { logger } from '@lark-apaas/client-toolkit';

const COL_SETTING_KEY = 'list_col_settings_';

export interface FilterField {
  key: string;
  label: string;
  type: 'input' | 'select' | 'date-range';
  options?: { label: string; value: string }[];
  placeholder?: string;
  advanced?: boolean;
}

export interface ActionButton {
  label: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  icon?: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export interface Column<T extends Record<string, any>> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (record: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  defaultVisible?: boolean;
}

interface ServerListPageProps<T extends Record<string, any>> {
  title: string;
  description?: string;
  data: T[];
  total: number;
  loading?: boolean;
  columns: Column<T>[];
  filters?: FilterField[];
  primaryActions?: ActionButton[];
  rowActions?: ActionButton[] | ((record: T) => ActionButton[]);
  onRowClick?: (record: T) => void;
  rowKey?: keyof T;
  selectable?: boolean;
  pageSize?: number;
  page?: number;
  emptyText?: string;
  /** 空状态引导按钮文案，不传则不显示 */
  emptyActionText?: string;
  /** 空状态引导按钮点击回调 */
  onEmptyAction?: () => void;
  actionsRight?: ReactNode;
  batchActions?: ActionButton[];
  /** 是否显示内置导出按钮，默认开启 */
  exportable?: boolean;
  /** 导出按钮文案（默认“导出”） */
  exportLabel?: string;
  /** 导出全部筛选数据的回调；返回要导出的全部数据数组。不传则只导出当前页 */
  onExportAll?: () => Promise<T[]> | T[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (filters: Record<string, any>) => void;
  onReset?: () => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onRefresh?: () => void;
  selectedKeys?: string[];
  onSelectedChange?: (keys: string[]) => void;
  /** 用于列显隐持久化的唯一 key，不传则使用当前路由 pathname */
  storageKey?: string;
}

export default function ServerListPage<T extends Record<string, any>>({
  title,
  description,
  data,
  total,
  loading = false,
  columns,
  filters = [],
  primaryActions = [],
  rowActions = [],
  onRowClick,
  rowKey = 'id' as keyof T,
  selectable = true,
  page = 1,
  pageSize = 20,
  emptyText = '暂无数据',
  emptyActionText,
  onEmptyAction,
  actionsRight,
  batchActions = [],
  exportable = true,
  exportLabel,
  onExportAll,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onReset,
  onSort,
  sortBy,
  sortOrder,
  onRefresh,
  selectedKeys = [],
  onSelectedChange,
  storageKey,
}: ServerListPageProps<T>) {
  useLang();
  const { pathname } = useLocation();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 列显隐：按路由持久化到 localStorage
  const colStorageKey = `${COL_SETTING_KEY}${storageKey || pathname}`;
  const allColKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const defaultVisible = useMemo(
    () => columns.filter((c) => c.defaultVisible !== false).map((c) => c.key),
    [columns],
  );

  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    try {
      const saved = scopedStorage.getItem(colStorageKey);
      if (saved) {
        const arr = JSON.parse(saved);
        // 只保留当前仍然存在的列，避免历史残留脏数据
        const filtered = arr.filter((k: string) => allColKeys.includes(k));
        if (filtered.length > 0) return filtered;
      }
    } catch {
      // ignore
    }
    return defaultVisible;
  });

  // 列变化时持久化
  useEffect(() => {
    try {
      scopedStorage.setItem(colStorageKey, JSON.stringify(visibleCols));
    } catch {
      logger.warn('保存列设置失败');
    }
  }, [visibleCols, colStorageKey]);

  const displayedColumns = useMemo(
    () => columns.filter((c) => visibleCols.includes(c.key)),
    [columns, visibleCols],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const basicFilters = filters.filter((f) => !f.advanced);
  const advancedFilters = filters.filter((f) => f.advanced);

  const renderFilterField = (f: FilterField) => {
    const val = filterValues[f.key] || '';
    if (f.type === 'select') {
      return (
        <div key={f.key} className="flex items-center gap-2">
            <label className="shrink-0 text-sm text-muted-foreground">{t(f.label)}</label>
          <Select value={val || 'all'} onValueChange={(v) => setFilterValues((p) => ({ ...p, [f.key]: v }))}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder={f.placeholder ? t(f.placeholder) : t('全部')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('全部')}</SelectItem>
              {f.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (f.type === 'date-range') {
      return (
        <div key={f.key} className="flex items-center gap-2">
            <label className="shrink-0 text-sm text-muted-foreground">{t(f.label)}</label>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={filterValues[`${f.key}Start`] || ''}
              onChange={(e) => setFilterValues((p) => ({ ...p, [`${f.key}Start`]: e.target.value }))}
            />
            <span className="text-muted-foreground">{t('至')}</span>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={filterValues[`${f.key}End`] || ''}
              onChange={(e) => setFilterValues((p) => ({ ...p, [`${f.key}End`]: e.target.value }))}
            />
          </div>
        </div>
      );
    }
    return (
      <div key={f.key} className="flex items-center gap-2">
            <label className="shrink-0 text-sm text-muted-foreground">{t(f.label)}</label>
        <Input
          className="h-8 w-44"
              placeholder={f.placeholder ? t(f.placeholder) : `${t('请输入')}${t(f.label)}`}
          value={val}
          onChange={(e) => setFilterValues((p) => ({ ...p, [f.key]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
      </div>
    );
  };

  const handleSearch = () => {
    onSearch?.(filterValues);
  };

  const handleReset = () => {
    setFilterValues({});
    onReset?.();
  };

  // 导出（支持全部筛选数据 / 当前页）
  const handleExport = async () => {
    setExporting(true);
    try {
      let exportData: T[] = data;
      if (onExportAll) {
        const all = await onExportAll();
        exportData = all;
      }
      if (exportData.length === 0) {
        toast.warning(t('当前页无可导出的数据'));
        return;
      }
      const headers = displayedColumns.map((c) => t(c.title));
      const rows = exportData.map((r) =>
        displayedColumns.map((c) => {
          const raw = c.dataIndex ? r[c.dataIndex] : (r as Record<string, any>)[c.key];
          return typeof raw === 'object' ? '' : raw;
        }),
      );
      exportCSV(title, headers, rows);
      toast.success(`${t('已导出')} ${rows.length} ${t('条')}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />

      {/* 筛选区 */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {basicFilters.map(renderFilterField)}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={handleReset}>
                {t('重置')}
              </Button>
              <Button size="sm" className="h-8" onClick={handleSearch}>
                <Search className="mr-1 size-3.5" /> {t('查询')}
              </Button>
              {advancedFilters.length > 0 && (
                <button
                  className="flex items-center text-xs text-primary hover:underline"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? t('收起') : t('展开')}
                  {showAdvanced ? <ChevronUp className="ml-0.5 size-3" /> : <ChevronDown className="ml-0.5 size-3" />}
                </button>
              )}
            </div>
          </div>
          {showAdvanced && advancedFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border/60 pt-3">
              {advancedFilters.map(renderFilterField)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮区 + 表格 */}
      <Card className="shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            {primaryActions.map((a, i) => (
              <Button
                key={i}
                size="sm"
                variant={a.variant || (a.primary ? 'default' : 'outline')}
                className="h-8"
                onClick={a.onClick}
              >
                {a.primary && !a.icon && <Plus className="mr-1 size-3.5" />}
                {a.icon}
                {t(a.label)}
              </Button>
            ))}
            {selectable && selectedKeys.length > 0 && batchActions.length > 0 && (
              <BatchActionBar
                className="ml-2"
                selectedCount={selectedKeys.length}
                actions={batchActions}
                onClear={() => onSelectedChange?.([])}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {actionsRight}
            {exportable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                title={t('导出')}
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className={cn('size-4', exporting && 'animate-spin')} />
                <span className="text-xs">{exportLabel || t('导出')}</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title={t('列设置')}>
                  <Settings2 className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.includes(c.key)}
                    onCheckedChange={(checked) =>
                      setVisibleCols((prev) =>
                        checked ? [...prev, c.key] : prev.filter((k) => k !== c.key),
                      )
                    }
                  >
                    {t(c.title)}
                  </DropdownMenuCheckboxItem>
                ))}
                <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2 py-1.5">
                  <button
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                    onClick={() => setVisibleCols(allColKeys)}
                    disabled={visibleCols.length === allColKeys.length}
                  >
                    {t('全选')}
                  </button>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setVisibleCols(defaultVisible)}
                  >
                    {t('重置')}
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('刷新')} onClick={onRefresh}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <DataTable
          data={data}
          columns={displayedColumns}
          loading={loading}
          rowKey={rowKey}
          selectable={selectable}
          selectedKeys={selectedKeys}
          onSelectedChange={onSelectedChange}
          rowActions={rowActions}
          onRowClick={onRowClick}
          emptyText={emptyText}
          emptyActionText={emptyActionText}
          onEmptyAction={onEmptyAction}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />

        {/* 分页 */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
          <div className="text-xs text-muted-foreground">
            {t('共')} <span className="font-medium text-foreground">{total}</span> {t('条')}
          </div>
          <div className="flex items-center gap-1">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange?.(Number(v))}
            >
              <SelectTrigger className="h-7 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {t('条/页')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange?.(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange?.(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
