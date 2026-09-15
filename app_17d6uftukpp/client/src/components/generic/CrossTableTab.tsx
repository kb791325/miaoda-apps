import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Database } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit';
import type { IBizRecord } from '@/data/mt-records';
import type { IDetailTab } from '@/config/modules';
import { MODULES } from '@/config/modules';
import { loadModuleRecordsForCrossTable } from '@/lib/data-service';
import { formatDisplayValue, formatMoney } from '@/lib/format';
import { toPlainText } from '@/lib/link-utils';
import { cn } from '@/lib/utils';

interface CrossTableTabProps {
  tab: IDetailTab;
  parentRecord: IBizRecord;
  moduleConfig: {
    key: string;
    label: string;
    fields: Array<{ key: string; label: string; type?: string; money?: boolean; options?: Array<{ label: string; value: string; className?: string }> }>;
  };
}

/** 格式化单元格值：统一走 formatDisplayValue (人员→姓名、时间戳→日期、兜底→'—') */
function formatCellValue(raw: string | number | undefined | null): string {
  return formatDisplayValue(raw);
}

/** 单表数据加载与过滤 */
function useTableData(
  tableKey: string,
  parentRecord: IBizRecord,
  tab: IDetailTab,
) {
  const [records, setRecords] = useState<IBizRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const parentValue = useMemo(() => {
    if (tab.parentField === 'recordId') {
      return toPlainText(parentRecord.recordId ?? '');
    }
    const raw = parentRecord.values[tab.parentField];
    if (raw !== undefined && raw !== null) return toPlainText(raw);
    return '';
  }, [parentRecord, tab.parentField]);

  const matchByChildId = !tab.linkField;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadModuleRecordsForCrossTable(tableKey as any)
      .then((allRecords) => {
        if (cancelled) return;
        const filtered = allRecords.filter((r) => {
          if (matchByChildId) {
            const childId = toPlainText(r.recordId);
            return childId && parentValue && childId === parentValue;
          }
          const fkPlain = toPlainText(r.values[tab.linkField]);
          return fkPlain && parentValue && fkPlain === parentValue;
        });
        logger.info(
          `CrossTableTab[${tab.key}][${tableKey}] parentValue="${parentValue}" filtered=${filtered.length}/${allRecords.length}`,
        );
        setRecords(filtered);
      })
      .catch((err) => {
        logger.error(`CrossTableTab[${tab.key}][${tableKey}] load failed:`, String(err));
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, [tableKey, parentValue, tab.linkField, tab.key]);

  return { records, loading };
}

/** 单表渲染 */
function SubTableBlock({
  tableKey,
  label,
  records,
  loading,
}: {
  tableKey: string;
  label: string;
  records: IBizRecord[];
  loading: boolean;
}) {
  const subConfig = MODULES[tableKey];

  // 构建字段 key→label 映射
  const fieldLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    if (subConfig?.fields) {
      for (const f of subConfig.fields) {
        if (!map.has(f.key)) map.set(f.key, f.label);
      }
    }
    // 兜底：用记录里的 key 补全
    if (records.length > 0) {
      for (const key of Object.keys(records[0].values)) {
        if (!map.has(key)) map.set(key, key);
      }
    }
    return map;
  }, [subConfig, records]);

  const subFields = useMemo(() => {
    if (records.length === 0) return [];
    return Object.keys(records[0].values)
      .filter((k) => k !== 'recordId' && k !== 'tableId')
      .slice(0, 6);
  }, [records]);

  // 构建字段 key→元信息(类型/金额)
  const fieldMetaMap = useMemo(() => {
    const map = new Map<string, { type?: string; money?: boolean }>();
    if (subConfig?.fields) {
      for (const f of subConfig.fields) {
        if (!map.has(f.key)) map.set(f.key, { type: f.type, money: f.money });
      }
    }
    return map;
  }, [subConfig]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Database className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">暂无{label}记录</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {subFields.map((key) => (
              <TableHead key={key} className="whitespace-nowrap">
                {fieldLabelMap.get(key) ?? key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.recordId}>
              {subFields.map((key) => {
                const val = r.values[key];
                const meta = fieldMetaMap.get(key);
                const label = fieldLabelMap.get(key) ?? key;
                const isMoney = meta?.money;
                const display = formatCellValue(val);
                return (
                  <TableCell key={key} className={cn(isMoney && 'tabular-nums font-medium')}>
                    {display}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function CrossTableTab({ tab, parentRecord }: CrossTableTabProps) {
  const tableKeys = useMemo(() => {
    if (tab.subTableKeys && tab.subTableKeys.length > 0) return tab.subTableKeys;
    if (tab.subTableKey) return [tab.subTableKey];
    return [];
  }, [tab.subTableKey, tab.subTableKeys]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-muted-foreground" />
          {tab.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tableKeys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Database className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">暂无{tab.label}配置</p>
          </div>
        ) : tableKeys.length === 1 ? (
          /* 单表模式 */
          <SingleTableBlock tableKey={tableKeys[0]} parentRecord={parentRecord} tab={tab} />
        ) : (
          /* 多表分区模式：每个子表独立加载 + 独立渲染 */
          <div className="divide-y divide-border/60">
            {tableKeys.map((tk) => (
              <MultiTableBlock key={tk} tableKey={tk} parentRecord={parentRecord} tab={tab} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SingleTableBlock({
  tableKey,
  parentRecord,
  tab,
}: {
  tableKey: string;
  parentRecord: IBizRecord;
  tab: IDetailTab;
}) {
  const { records, loading } = useTableData(tableKey, parentRecord, tab);
  const cfg = MODULES[tableKey];
  const label = cfg?.label ?? tableKey;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        {!loading && (
          <Badge variant="secondary" className="text-xs font-normal">
            {records.length} 条
          </Badge>
        )}
      </div>
      <SubTableBlock tableKey={tableKey} label={label} records={records} loading={loading} />
    </div>
  );
}

function MultiTableBlock({
  tableKey,
  parentRecord,
  tab,
}: {
  tableKey: string;
  parentRecord: IBizRecord;
  tab: IDetailTab;
}) {
  const { records, loading } = useTableData(tableKey, parentRecord, tab);
  const cfg = MODULES[tableKey];
  const label = cfg?.label ?? tableKey;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Database className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        {!loading && (
          <Badge variant="secondary" className="text-xs font-normal">
            {records.length} 条
          </Badge>
        )}
      </div>
      <SubTableBlock tableKey={tableKey} label={label} records={records} loading={loading} />
    </div>
  );
}