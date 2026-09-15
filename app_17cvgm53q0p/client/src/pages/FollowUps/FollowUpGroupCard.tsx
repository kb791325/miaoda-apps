import { type FC } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { UserDisplay } from '@/components/business-ui/user-display';
import type { FollowUpRecord } from '@shared/follow-up';
import {
  formatAmount,
  formatDateTime,
} from '@/pages/Customers/customer-utils';
import SalesStageBadge from '@/pages/Customers/SalesStageBadge';

export interface CustomerFollowUpGroup {
  customerId: string;
  customerName: string;
  records: FollowUpRecord[];
}

interface FollowUpRowProps {
  record: FollowUpRecord;
  onOpenDetail: (record: FollowUpRecord) => void;
}

const FollowUpRow: FC<FollowUpRowProps> = ({ record, onOpenDetail }) => {
  const hasMeta =
    Boolean(record.demandProduct) ||
    record.budget !== null ||
    Boolean(record.nextFollowUpAt) ||
    Boolean(record.stageChange);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(record)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpenDetail(record);
      }}
      className="cursor-pointer border-t border-border px-4 py-3 transition-colors hover:bg-accent/30"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="w-32 shrink-0">
          {record.followerName ? (
            <span className="block truncate text-sm text-foreground">
              {record.followerName}
            </span>
          ) : record.followerId ? (
            <UserDisplay value={[record.followerId]} size="small" />
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
        <span className="w-36 shrink-0 text-sm tabular-nums text-muted-foreground">
          {formatDateTime(record.followUpAt)}
        </span>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">
          {record.method}
        </span>
        {record.intent && (
          <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {record.intent}
          </span>
        )}
        <p className="min-w-[200px] flex-1 break-words text-sm text-foreground">
          {record.content}
        </p>
      </div>
      {hasMeta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[8.5rem] text-xs text-muted-foreground">
          {record.demandProduct && <span>需求产品：{record.demandProduct}</span>}
          {record.budget !== null && (
            <span className="tabular-nums">
              预计预算：{formatAmount(record.budget)}
            </span>
          )}
          {record.nextFollowUpAt && (
            <span className="tabular-nums">
              下次跟进：{formatDateTime(record.nextFollowUpAt)}
            </span>
          )}
          {record.stageChange && <SalesStageBadge stage={record.stageChange} />}
        </div>
      )}
    </div>
  );
};

interface FollowUpGroupCardProps {
  group: CustomerFollowUpGroup;
  expanded: boolean;
  onToggle: () => void;
  onOpenDetail: (record: FollowUpRecord) => void;
}

const FollowUpGroupCard: FC<FollowUpGroupCardProps> = ({
  group,
  expanded,
  onToggle,
  onOpenDetail,
}) => {
  const latestRecord: FollowUpRecord | undefined = group.records[0];

  return (
    <Card className="overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
          {group.customerName || '未知客户'}
        </span>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {group.records.length} 条跟进
        </span>
        {latestRecord && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            最近跟进 {formatDateTime(latestRecord.followUpAt)}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            expanded ? '' : '-rotate-90'
          }`}
        />
       </button>
      {expanded && (
        <div>
            {group.records.map((record: FollowUpRecord) => (
              <FollowUpRow
                key={record.id}
                record={record}
                onOpenDetail={onOpenDetail}
              />
            ))}
        </div>
      )}
    </Card>
  );
};

export default FollowUpGroupCard;
