import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PurchaseItemView = { name: string; spec?: string; quantity: number; unit_price: number; subtotal?: number };

function safeItems(items: unknown): PurchaseItemView[] {
  let arr: unknown[] = [];
  if (Array.isArray(items)) arr = items;
  else if (typeof items === 'string' && items.length > 0) {
    try {
      const parsed: unknown = JSON.parse(items);
      if (Array.isArray(parsed)) arr = parsed;
    } catch { arr = []; }
  }
  return arr.map((raw): PurchaseItemView => {
    const it = raw as Record<string, unknown>;
    const quantity = Number(it.quantity ?? it.qty ?? 0) || 0;
    const unit_price = Number(it.unit_price ?? it.price ?? 0) || 0;
    return {
      name: String(it.name ?? it.item ?? ''),
      spec: it.spec == null ? undefined : String(it.spec),
      quantity,
      unit_price,
      subtotal: Number(it.subtotal ?? quantity * unit_price),
    };
  });
}
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import type { PurchaseRequisition } from '@/api/types';
import { formatAmount } from '@/lib/format';
import { FileText, Clock } from 'lucide-react';

interface PurchaseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PurchaseRequisition | null;
  steps: ApprovalStep[];
  canApprove?: boolean;
  onGoApprove?: (record: PurchaseRequisition) => void;
  onGenerateOrder?: (record: PurchaseRequisition) => void;
}

export default function PurchaseDetailDialog({
  open, onOpenChange, record, steps, canApprove, onGoApprove, onGenerateOrder,
}: PurchaseDetailDialogProps) {
  const [tab, setTab] = useState('info');

  useEffect(() => {
    if (open) setTab('info');
  }, [open]);

  if (!record) return null;

  const isApproved = record.status === '已通过';
  const canGenerateOrder = isApproved && !record.generated_order;
  const showApproveButtons = canApprove && (record.status === '待审批' || record.status === '审批中');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              采购申请详情
              <Badge variant="outline" className="font-normal">{record.req_no}</Badge>
            </DialogTitle>
            <Badge
              variant={
                record.status === '已通过' ? 'secondary' :
                record.status === '已驳回' ? 'destructive' :
                record.status === '待审批' ? 'secondary' : 'default'
              }
            >
              {record.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">
              <FileText className="mr-1.5 size-4" />
              申请信息
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="mr-1.5 size-4" />
              审批进度
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 pt-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">申请事由</div>
                <div className="font-medium">{record.reason || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">预计金额</div>
                <div className="font-semibold text-primary tabular-nums">
                  ¥{formatAmount(record.total_amount)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">申请人</div>
                <div>{record.applicant_name || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">所属部门</div>
                <div>{record.department || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">期望到货日期</div>
                <div>{record.expected_date || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">申请时间</div>
                <div>{record.created_at || '-'}</div>
              </div>
            </div>

            {/* 物品明细 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">采购物品明细</div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">物品名称</th>
                      <th className="px-3 py-2 text-left font-medium">规格</th>
                      <th className="px-3 py-2 text-right font-medium">数量</th>
                      <th className="px-3 py-2 text-right font-medium">单价</th>
                      <th className="px-3 py-2 text-right font-medium">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeItems(record.items).map((item: PurchaseItemView, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.spec || '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">¥{formatAmount(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">¥{formatAmount(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-medium">合计</td>
                      <td className="px-3 py-2 text-right font-bold text-primary tabular-nums">
                        ¥{formatAmount(record.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 备注 */}
            {record.remark && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">备注</div>
                <div className="rounded-md bg-muted/30 p-3 text-sm">{record.remark}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="pt-4">
            <ApprovalTimeline steps={steps} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
          {canGenerateOrder && (
            <Button onClick={() => onGenerateOrder?.(record)}>
              生成采购订单
            </Button>
          )}
          {record.generated_order && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              已生成采购订单
            </Badge>
          )}
           {showApproveButtons && (
             <Button onClick={() => onGoApprove?.(record)}>
               去审批
             </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
