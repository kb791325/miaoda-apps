import { User, Plus, Pencil } from 'lucide-react';

interface OperationHistoryItem {
  id: string;
  label: string;
  icon: typeof Plus;
  dotColor: string;
  lineColor: string;
  user?: string;
  time: string;
  remark?: string;
}

interface OperationHistoryProps {
  createdAt?: string;
  updatedAt?: string;
}

const actionLabelMap: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: '创建', icon: Plus, color: 'bg-primary' },
  update: { label: '修改', icon: Pencil, color: 'bg-muted-foreground' },
};

const OperationHistory = ({ createdAt, updatedAt }: OperationHistoryProps) => {
  const items: OperationHistoryItem[] = [];

  if (createdAt) {
    items.push({
      id: 'create',
      label: '创建支出',
      icon: actionLabelMap.create.icon,
      dotColor: actionLabelMap.create.color,
      lineColor: actionLabelMap.create.color,
      time: createdAt,
    });
  }

  if (updatedAt && createdAt && updatedAt !== createdAt) {
    items.push({
      id: 'update',
      label: '修改信息',
      icon: actionLabelMap.update.icon,
      dotColor: actionLabelMap.update.color,
      lineColor: actionLabelMap.update.color,
      time: updatedAt,
    });
  }

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold">操作记录</div>
        <div className="rounded-sm border bg-muted/30 p-3 text-sm text-muted-foreground">
          暂无操作记录
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">操作记录</div>
      <div className="space-y-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          return (
            <div key={item.id} className="relative flex gap-3">
              {!isLast && (
                <div
                  className={`absolute left-[7px] top-4 h-[calc(100%-8px)] w-px ${item.lineColor} opacity-30`}
                />
              )}
              <div className="relative z-10 mt-1.5 flex-shrink-0">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${item.dotColor}`}
                >
                  <Icon className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1 pb-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {item.user && (
                    <>
                      <User className="h-3 w-3" />
                      <span>{item.user}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{item.time}</span>
                </div>
                {item.remark && (
                  <div className="mt-1.5 rounded-sm border bg-muted/30 p-2 text-xs">
                    <span className="text-muted-foreground">备注：</span>
                    {item.remark}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OperationHistory;
