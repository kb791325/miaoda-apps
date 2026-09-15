import { Clock } from 'lucide-react';
import { cn } from '@client/src/lib/utils';

import { Button } from '@client/src/components/ui/button';
import { Card, CardContent } from '@client/src/components/ui/card';

import type {
  AssetOperationRecord,
  AssetOperationType,
  AssetStatus,
} from '@shared/api.interface';

interface Props {
  records: AssetOperationRecord[];
  total: number;
  loading: boolean;
  onLoadMore: () => void;
}

const statusLabelMap: Record<AssetStatus, string> = {
  in_stock: '在库',
  in_use: '在用',
  idle: '闲置',
  repairing: '维修',
  transferring: '调拨中',
  scrapped: '报废',
};

const opTypeLabelMap: Record<AssetOperationType, string> = {
  borrow: '资产领用',
  return: '资产归还',
  transfer: '资产调拨',
  repair_start: '发起维修',
  repair_complete: '完成维修',
  scrap: '资产报废',
  status_change: '状态变更',
};

const opTypeColorMap: Record<AssetOperationType, string> = {
  borrow: 'bg-primary',
  return: 'bg-success',
  transfer: 'bg-[hsl(270_50%_55%)] dark:bg-[hsl(270_60%_65%)]',
  repair_start: 'bg-warning',
  repair_complete: 'bg-warning/80',
  scrap: 'bg-destructive',
  status_change: 'bg-muted-foreground',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TimelineItem = ({ record }: { record: AssetOperationRecord }) => {
  const dotColor = opTypeColorMap[record.operationType] || 'bg-muted';
  const details: string[] = [];
  if (record.reason) details.push(`原因：${record.reason}`);
  if (record.targetDepartment) details.push(`目标部门：${record.targetDepartment}`);
  if (record.targetFloor) details.push(`目标楼层：${record.targetFloor}`);
  if (record.cost !== undefined && record.cost !== null)
    details.push(`费用：¥${formatCurrency(record.cost)}`);
  if (record.vendor) details.push(`维修商：${record.vendor}`);
  if (record.expectedDate) details.push(`预计：${record.expectedDate}`);
  if (record.remark) details.push(`备注：${record.remark}`);

  return (
    <div className="relative pl-6 pb-5 last:pb-0">
      <div
        className={cn(
           'absolute left-0 top-1.5 size-2.5 rounded-full ring-2 ring-card shadow-sm',
          dotColor,
        )}
      />
      <div className="absolute left-[5px] top-4 bottom-0 w-px bg-border" />
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">
          {opTypeLabelMap[record.operationType]}
        </span>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {formatDateTime(record.createdAt)}
        </span>
      </div>
      {record.fromStatus && record.toStatus && (
        <div className="text-xs text-muted-foreground mb-1.5">
          {statusLabelMap[record.fromStatus]} →{' '}
          <span className="text-foreground">
            {statusLabelMap[record.toStatus]}
          </span>
        </div>
      )}
      {details.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const OperationTimeline = ({ records, total, loading, onLoadMore }: Props) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary" />
        <span className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          操作历史
          <span className="text-xs text-muted-foreground font-normal">
            共 {total} 条
          </span>
        </span>
      </h3>
      <Card className="border rounded-sm shadow-none">
        <CardContent className="p-4">
          {records.length === 0 && !loading ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              暂无操作记录
            </div>
          ) : (
            <>
              {records.map((r) => (
                <TimelineItem key={r.id} record={r} />
              ))}
              {records.length < total && (
                <div className="pt-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loading}
                    className="rounded-sm text-xs"
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationTimeline;
