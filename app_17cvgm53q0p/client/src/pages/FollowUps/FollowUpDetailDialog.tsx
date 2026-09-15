import { type FC, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserDisplay } from '@/components/business-ui/user-display';
import type { FollowUpRecord } from '@shared/follow-up';
import {
  formatAmount,
  formatDateTime,
} from '@/pages/Customers/customer-utils';
import SalesStageBadge from '@/pages/Customers/SalesStageBadge';

interface FollowUpDetailDialogProps {
  record: FollowUpRecord | null;
  onClose: () => void;
}

interface DetailFieldProps {
  label: string;
  children: ReactNode;
}

const DetailField: FC<DetailFieldProps> = ({ label, children }) => (
  <div className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <div className="min-w-0 break-words text-foreground">{children}</div>
  </div>
);

const FollowUpDetailDialog: FC<FollowUpDetailDialogProps> = ({
  record,
  onClose,
}) => (
  <Dialog
    open={record !== null}
    onOpenChange={(next: boolean) => {
      if (!next) onClose();
    }}
  >
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>跟进记录详情</DialogTitle>
        <DialogDescription>查看本次跟进的完整信息</DialogDescription>
      </DialogHeader>
      {record && (
        <div className="space-y-3">
          <DetailField label="客户">{record.customerName || '-'}</DetailField>
          <DetailField label="跟进人">
            {record.followerName ? (
              record.followerName
            ) : record.followerId ? (
              <UserDisplay value={[record.followerId]} size="small" />
            ) : (
              '-'
            )}
          </DetailField>
          <DetailField label="跟进时间">
            {formatDateTime(record.followUpAt)}
          </DetailField>
          <DetailField label="跟进方式">{record.method}</DetailField>
          <DetailField label="客户意向度">
            {record.intent || '-'}
          </DetailField>
          <DetailField label="跟进内容">{record.content}</DetailField>
          <DetailField label="需求产品">
            {record.demandProduct || '-'}
          </DetailField>
          <DetailField label="预计预算">
            {record.budget !== null ? formatAmount(record.budget) : '-'}
          </DetailField>
          <DetailField label="下次跟进时间">
            {record.nextFollowUpAt
              ? formatDateTime(record.nextFollowUpAt)
              : '-'}
          </DetailField>
          <DetailField label="阶段变化">
            {record.stageChange ? (
              <SalesStageBadge stage={record.stageChange} />
            ) : (
              '-'
            )}
          </DetailField>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default FollowUpDetailDialog;
