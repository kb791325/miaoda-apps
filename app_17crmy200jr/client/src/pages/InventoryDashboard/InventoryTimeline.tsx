import { useNavigate } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import type { TimelineOwner } from '@shared/api.interface';

interface InventoryTimelineProps {
  data: TimelineOwner[];
  loading?: boolean;
  maxItems?: number;
}

function getDaysLabel(days: number) {
  if (days < 7) {
    return { text: `${days}天前`, className: 'bg-success/10 text-success border-success/30' };
  }
  if (days <= 30) {
    return { text: `${days}天前`, className: 'bg-warning/10 text-warning border-warning/30' };
  }
  return { text: `${days}天前`, className: 'bg-destructive/10 text-destructive border-destructive/30' };
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return dateStr.split('T')[0];
}

export function InventoryTimeline({
  data,
  loading,
  maxItems = 15,
}: InventoryTimelineProps) {
  const displayData = data.slice(0, maxItems);

  const navigate = useNavigate();

  const handleInitiateCheck = () => {
    navigate('/inventory-checks');
  };

  return (
    <div className="bg-card border border-border rounded-sm flex flex-col h-full" data-ai-section-type="card-list">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">盘点时间线</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          共 {data.length} 人
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px]">
        {loading && (
          <div className="p-6 text-center text-muted-foreground text-sm">加载中...</div>
        )}
        {!loading && data.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">暂无数据</div>
        )}
        {displayData.map((item: TimelineOwner) => {
          const daysLabel = getDaysLabel(item.daysSinceLastCheck);
          const initial = item.ownerName?.charAt(0) || '?';
          return (
            <div
              key={item.ownerId}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 hover:bg-accent/30 transition-colors"
            >
              {/* Avatar & owner */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <UserDisplay value={item.ownerId ? [item.ownerId] : []} size="small" />
                  <span className="text-xs text-muted-foreground truncate">
                    {item.department}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {item.assetCount} 件资产
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border ${daysLabel.className}`}
                  >
                    {daysLabel.text}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="text-right flex-shrink-0 mr-2">
                <div className="text-xs text-muted-foreground">上次盘点</div>
                <div className="text-xs font-mono text-foreground">
                  {formatDate(item.lastCheckDate)}
                </div>
              </div>

              {/* Next date */}
              <div className="text-right flex-shrink-0 mr-2">
                <div className="text-xs text-muted-foreground">建议下次</div>
                <div className="text-xs font-mono text-foreground">
                  {formatDate(item.nextSuggestedDate)}
                </div>
              </div>

              {/* Action button */}
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0"
                onClick={handleInitiateCheck}
              >
                <PlayCircle className="size-3.5" />
                发起盘点
              </Button>
            </div>
          );
        })}
        {data.length > maxItems && (
          <div className="px-3 py-2 text-center text-xs text-muted-foreground border-t border-border/50">
            已展示前 {maxItems} 条，共 {data.length} 条
          </div>
        )}
      </div>
    </div>
  );
}
