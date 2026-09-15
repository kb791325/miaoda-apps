import dayjs from 'dayjs';
import { Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@client/src/pages/Finance/finance-utils';
import type { ExpenseItem } from '@shared/finance-contract';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, children }) => (
  <div className="flex items-start gap-3">
    <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
    <span className="min-w-0 flex-1 break-words">{children}</span>
  </div>
);

interface ExpenseDetailDialogProps {
  item: ExpenseItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 费用详情：展示全部字段含审批信息 */
const ExpenseDetailDialog: React.FC<ExpenseDetailDialogProps> = ({
  item,
  open,
  onOpenChange,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>费用详情</DialogTitle>
      </DialogHeader>
      {item ? (
        <div className="flex flex-col gap-3 text-base">
          <DetailRow label="费用单号">
            <span className="font-mono">{item.expenseNo}</span>
          </DetailRow>
          <DetailRow label="分类">{item.category}</DetailRow>
          <DetailRow label="金额">
            <span className="font-semibold tabular-nums">
              {formatMoney(item.amount)}
            </span>
          </DetailRow>
          <DetailRow label="发生日期">{item.expenseDate}</DetailRow>
          <DetailRow label="报销人">{item.payerName || '-'}</DetailRow>
          <DetailRow label="支付账户">{item.account}</DetailRow>
          <DetailRow label="审批状态">{item.approvalStatus}</DetailRow>
          <DetailRow label="审批人">{item.approverName || '-'}</DetailRow>
          <DetailRow label="审批时间">
            {item.approvalTime
              ? dayjs(item.approvalTime).format('YYYY-MM-DD HH:mm')
              : '-'}
          </DetailRow>
          <DetailRow label="审批意见">{item.approvalRemark || '-'}</DetailRow>
          <DetailRow label="备注">{item.remark || '-'}</DetailRow>
          <DetailRow label="附件">
            {item.attachmentUrl ? (
              <UniversalLink
                to={item.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Paperclip className="size-4" />
                查看附件
              </UniversalLink>
            ) : (
              '-'
            )}
          </DetailRow>
          <DetailRow label="创建时间">
            {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
          </DetailRow>
        </div>
      ) : null}
    </DialogContent>
  </Dialog>
);

export default ExpenseDetailDialog;
