import React, { Fragment, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { OwnerMatrixRow } from '@shared/api.interface';

interface InventoryMatrixProps {
  data: OwnerMatrixRow[];
  loading?: boolean;
  onSearch: (params: { department?: string; search?: string }) => void;
  searchParams: { department?: string; search?: string };
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface CellDetail {
  ownerId: string;
  ownerName: string;
  department: string;
  month: number;
  status: string;
  checkDate?: string;
  checker?: string;
}

const STATUS_COLORS: Record<string, string> = {
  checked: 'bg-success',
  unchecked: 'bg-muted',
  abnormal: 'bg-destructive',
};

const STATUS_LABEL: Record<string, string> = {
  checked: '已盘点',
  unchecked: '未盘点',
  abnormal: '异常',
};

export const InventoryMatrix = React.memo(function InventoryMatrix({
  data,
  loading,
  onSearch,
  searchParams,
}: InventoryMatrixProps) {
  const [searchInput, setSearchInput] = useState(searchParams.search || '');
  const [detail, setDetail] = useState<CellDetail | null>(null);

  const departments = useMemo(() => {
    const set = new Set(data.map((row: OwnerMatrixRow) => row.department));
    return Array.from(set).sort();
  }, [data]);

  const groupedByDept = useMemo(() => {
    const map = new Map<string, OwnerMatrixRow[]>();
    for (const row of data) {
      const list = map.get(row.department) || [];
      list.push(row);
      map.set(row.department, list);
    }
    return map;
  }, [data]);

  const handleSearch = () => {
    onSearch({ ...searchParams, search: searchInput || undefined });
  };

  const handleDeptChange = (value: string) => {
    const dept = value === '__all__' ? undefined : value;
    onSearch({ ...searchParams, department: dept, search: searchInput || undefined });
  };

  const handleCellClick = (
    row: OwnerMatrixRow,
    monthItem: { month: number; status: string; checkDate?: string; checker?: string }
  ) => {
    setDetail({
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      department: row.department,
      month: monthItem.month,
      status: monthItem.status,
      checkDate: monthItem.checkDate,
      checker: monthItem.checker,
    });
  };

  const getMonthStatus = (row: OwnerMatrixRow, month: number) => {
    return row.monthly.find((m) => m.month === month) || { month, status: 'unchecked' as const };
  };

  return (
    <div className="bg-card border border-border rounded-sm" data-ai-section-type="card-list">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-foreground">归属人盘点矩阵</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">部门</span>
            <Select
              value={searchParams.department || '__all__'}
              onValueChange={handleDeptChange}
            >
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder="全部部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部部门</SelectItem>
                {departments.map((dept: string) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Input
              size={1}
              placeholder="搜索归属人"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="w-[180px] h-8 text-sm"
            />
            <Button size="sm" variant="secondary" onClick={handleSearch}>
              <Search className="size-3.5" />
              搜索
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-border bg-accent/30">
        <span className="text-xs text-muted-foreground">图例：</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-success" />
          <span className="text-xs text-muted-foreground">已盘点</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span className="text-xs text-muted-foreground">未盘点</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive" />
          <span className="text-xs text-muted-foreground">异常</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wider px-3 py-2 bg-muted/30 sticky left-0 z-10 min-w-[220px] w-[220px]">
                归属人
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  className="text-center font-medium text-muted-foreground text-xs px-1 py-2 bg-muted/30 w-10 min-w-[40px]"
                >
                  {m}月
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={13} className="text-center py-8 text-muted-foreground">
                  加载中...
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </td>
              </tr>
            )}
            {Array.from(groupedByDept.entries()).map(([dept, rows]) => (
              <Fragment key={dept}>
                {/* Department header row */}
                <tr key={`dept-${dept}`} className="bg-accent/50">
                  <td
                    colSpan={13}
                    className="px-3 py-1.5 text-xs font-semibold text-foreground border-b border-border"
                  >
                    {dept}
                  </td>
                </tr>
                {rows.map((row) => (
                  <tr
                    key={row.ownerId}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    <td className="px-3 py-2 sticky left-0 bg-card z-[1] border-r border-border/50 min-w-[220px] w-[220px]">
                      <div className="font-medium text-foreground text-sm">
                        <UserDisplay value={row.ownerId ? [row.ownerId] : []} size="small" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {row.assetCount} 件资产
                      </div>
                    </td>
                    {MONTHS.map((m) => {
                      const monthData = getMonthStatus(row, m);
                      return (
                        <td key={m} className="text-center p-1">
                          <div
                            className={`w-6 h-6 rounded-sm mx-auto cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${STATUS_COLORS[monthData.status] || 'bg-muted'}`}
                            title={`${STATUS_LABEL[monthData.status] || '未盘点'}${monthData.checkDate ? ` · ${monthData.checkDate}` : ''}${monthData.checker ? ` · ${monthData.checker}` : ''}`}
                            onClick={() => handleCellClick(row, monthData)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>盘点明细</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">归属人</div>
                  <div className="font-medium"><UserDisplay value={detail.ownerId ? [detail.ownerId] : []} size="small" /></div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">部门</div>
                  <div className="font-medium">{detail.department}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">月份</div>
                  <div className="font-medium">{detail.month}月</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">状态</div>
                  <div className="font-medium">{STATUS_LABEL[detail.status] || '未知'}</div>
                </div>
                {detail.checkDate && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">盘点日期</div>
                    <div className="font-medium font-mono">{detail.checkDate}</div>
                  </div>
                )}
                {detail.checker && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">盘点人</div>
                    <div className="font-medium">{detail.checker}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});
