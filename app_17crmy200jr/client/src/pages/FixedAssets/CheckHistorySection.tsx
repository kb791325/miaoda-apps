import { Badge } from '@client/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';

import type { CheckHistoryItem } from '@shared/api.interface';

const CheckHistorySection = ({ items }: { items: CheckHistoryItem[] }) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary" />
        盘点历史（最近5条）
      </h3>
      <div className="border border-border rounded-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-xs font-medium text-muted-foreground">
                盘点日期
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">
                实盘数量
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">
                差异
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                状态
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-4 text-xs text-muted-foreground"
                >
                  暂无盘点记录
                </TableCell>
              </TableRow>
            ) : (
              items.map((h) => (
                <TableRow key={h.id} className="border-border h-9">
                  <TableCell className="text-xs">{h.checkDate}</TableCell>
                  <TableCell className="text-right text-xs font-mono tabular-nums">
                    {h.actualQuantity}
                  </TableCell>
                  <TableCell
                    className={
                      h.difference !== 0
                        ? 'text-right text-xs font-mono tabular-nums text-destructive'
                        : 'text-right text-xs font-mono tabular-nums'
                    }
                  >
                    {h.difference > 0 ? '+' : ''}
                    {h.difference}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={h.status === 'normal' ? 'secondary' : 'destructive'}
                      className="rounded-sm font-normal"
                    >
                      {h.status === 'normal' ? '正常' : '异常'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CheckHistorySection;
