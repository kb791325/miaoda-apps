import { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@client/src/components/ui/drawer';
import { Button } from '@client/src/components/ui/button';
import type { ExpenseDetail } from '@shared/api.interface';
import * as expensesApi from '@client/src/api/expenses';
import ExpenseAttachmentPreview from './ExpenseAttachmentPreview';
import OperationHistory from './OperationHistory';

interface ExpenseDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string | null;
  onChanged: () => void;
}

const formatAmount = (val: number): string =>
  val.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ExpenseDetailDrawer = ({
  open,
  onOpenChange,
  expenseId,
  onChanged,
}: ExpenseDetailDrawerProps) => {
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !expenseId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    expensesApi
      .getExpense(expenseId)
      .then((data) => setDetail(data))
      .catch((err: unknown) => {
        logger.error('加载支出详情失败', err);
        toast.error('加载详情失败');
      })
      .finally(() => setLoading(false));
  }, [open, expenseId]);

  const refreshDetail = async () => {
    if (!expenseId) return;
    try {
      const updated = await expensesApi.getExpense(expenseId);
      setDetail(updated);
      onChanged();
    } catch (err) {
      logger.error('刷新详情失败', err);
    }
  };

  return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="h-full w-full max-w-md rounded-none border-l">
          <DrawerHeader className="border-b">
            <DrawerTitle>支出详情</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-muted-foreground text-sm">加载中...</div>
            ) : !detail ? (
              <div className="text-muted-foreground text-sm py-8 text-center">
                加载失败或数据不存在
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-sm font-semibold">基本信息</div>
                  <div className="divide-y divide-border rounded-sm border">
                    <InfoRow label="支出日期" value={detail.expenseDate} />
                    <InfoRow
                      label="支出金额"
                      value={`¥${formatAmount(detail.amount)}`}
                      valueClassName="font-mono text-right text-base font-semibold"
                    />
                    <InfoRow label="一级类目" value={detail.categoryL1} />
                    <InfoRow label="二级类目" value={detail.categoryL2} />
                    <InfoRow label="付费主体" value={detail.payerEntity} />
                    <InfoRow label="使用楼层" value={detail.floor} />
                    <InfoRow label="部门" value={detail.department} />
                    <InfoRow
                      label="采购申请部门"
                      value={detail.purchaseDepartment}
                    />
                    <InfoRow
                      label="经办人"
                      value={detail.handlerDetail?.name || detail.handler}
                    />
                    <InfoRow
                      label="创建时间"
                      value={detail.createdAt}
                    />
                    <InfoRow
                      label="更新时间"
                      value={detail.updatedAt}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">支出说明</div>
                  <div className="rounded-sm border bg-muted/30 p-3 text-sm">
                    {detail.description || '无'}
                  </div>
                </div>

                {/* 附件预览 */}
                <ExpenseAttachmentPreview
                  invoiceUrl={detail.invoiceUrl}
                  screenshotUrl={detail.screenshotUrl}
                />

                {/* 操作记录 */}
                <OperationHistory
                  createdAt={detail.createdAt}
                  updatedAt={detail.updatedAt}
                />
              </div>
            )}
          </div>
          <DrawerFooter className="border-t bg-card">
            <DrawerClose asChild>
              <Button variant="outline">关闭</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
  );
};

const InfoRow = ({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex items-center justify-between px-3 py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={`text-foreground ${valueClassName}`}>{value || '-'}</span>
  </div>
);

export default ExpenseDetailDrawer;
