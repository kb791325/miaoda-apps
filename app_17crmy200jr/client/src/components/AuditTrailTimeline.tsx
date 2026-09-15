import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  CheckCheck,
  ArrowRightLeft,
  RefreshCw,
  LogIn,
  FileUp,
  FileDown,
} from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import type { AuditLogItem } from '@shared/api.interface';

// ============ 类型 ============

interface AuditTrailTimelineProps {
  items: AuditLogItem[];
  onSelect?: (item: AuditLogItem) => void;
}

// ============ 常量 ============

const TYPE_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  create: {
    label: '新增',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  update: {
    label: '修改',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  delete: {
    label: '删除',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  approve: {
    label: '审批',
    className: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  borrow: {
    label: '借出',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  return: {
    label: '归还',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  login: {
    label: '登录',
    className: 'border-gray-200 bg-gray-50 text-gray-500',
  },
  export: {
    label: '导出',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  import: {
    label: '导入',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
};

const TYPE_NODE_CONFIG: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  create: { color: 'border-green-500 bg-green-100', icon: Plus },
  update: { color: 'border-blue-500 bg-blue-100', icon: Pencil },
  delete: { color: 'border-red-500 bg-red-100', icon: Trash2 },
  approve: { color: 'border-purple-500 bg-purple-100', icon: CheckCheck },
  borrow: { color: 'border-orange-500 bg-orange-100', icon: ArrowRightLeft },
  return: { color: 'border-cyan-500 bg-cyan-100', icon: RefreshCw },
  login: { color: 'border-gray-400 bg-gray-100', icon: LogIn },
  export: { color: 'border-orange-500 bg-orange-100', icon: FileUp },
  import: { color: 'border-green-500 bg-green-100', icon: FileDown },
};

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  success: {
    label: '成功',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  failure: {
    label: '失败',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

// ============ 工具函数 ============

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getTypeBadge(type: string) {
  return (
    TYPE_BADGE_MAP[type] ?? {
      label: type || '未知',
      className: 'border-border bg-accent/50 text-muted-foreground',
    }
  );
}

function getNodeConfig(type: string) {
  return (
    TYPE_NODE_CONFIG[type] ?? {
      color: 'border-primary bg-primary/10',
      icon: GitBranch,
    }
  );
}

function getStatusBadge(status: string) {
  return (
    STATUS_BADGE_MAP[status] ?? {
      label: status || '未知',
      className: 'border-border bg-accent/50 text-muted-foreground',
    }
  );
}

// ============ 组件 ============

const AuditTrailTimeline = ({
  items,
  onSelect,
}: AuditTrailTimelineProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <GitBranch className="size-10 mb-3 opacity-40" />
        <p className="text-sm">暂无操作记录</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev: string | null) => (prev === id ? null : id));
  };

  return (
    <div className="relative pl-8">
      {/* 时间线竖线 */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-0">
        {items.map((item: AuditLogItem, index: number) => {
          const typeBadge = getTypeBadge(item.operationType);
          const statusBadge = getStatusBadge(item.status);
          const nodeConfig = getNodeConfig(item.operationType);
          const isExpanded = expandedId === item.id;
          const isLast = index === items.length - 1;
          const NodeIcon = nodeConfig.icon;

          return (
            <div key={item.id} className="relative pb-4">
              {/* 时间线节点 */}
              <div
                className={`absolute -left-[19px] top-1.5 flex size-5 items-center justify-center rounded-full border-2 ${nodeConfig.color}`}
              >
                <NodeIcon className="size-2.5" />
              </div>

              {/* 节点内容 */}
              <div className="rounded-sm border border-border bg-card">
                {/* 摘要行 */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => toggleExpand(item.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  )}

                  <Clock className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground min-w-[140px]">
                    {formatDateTime(item.createdAt)}
                  </span>

                  <Badge
                    variant="outline"
                    className={`rounded-sm text-xs ${typeBadge.className}`}
                  >
                    {typeBadge.label}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={`rounded-sm text-xs ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </Badge>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <User className="size-3 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">
                      {item.operatorName || item.operator || '—'}
                    </span>
                  </div>
                </button>

                {/* 展开详情 */}
                <div
                  className={`overflow-hidden transition-all duration-150 ease-out ${
                    isExpanded
                      ? 'max-h-[500px] opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  {isExpanded && (
                    <div className="border-t border-border px-3 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">
                          模块
                        </span>
                        <p className="text-foreground">{item.module || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          操作对象
                        </span>
                        <p className="text-foreground font-mono text-xs">
                          {item.targetName || item.targetId || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          IP 地址
                        </span>
                        <p className="text-foreground font-mono text-xs">
                          {item.ipAddress || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          耗时
                        </span>
                        <p className="text-foreground font-mono text-xs">
                          {item.duration != null ? `${item.duration}ms` : '—'}
                        </p>
                      </div>
                      {item.description && (
                        <div className="col-span-2">
                          <span className="text-xs text-muted-foreground">
                            描述
                          </span>
                          <p className="text-foreground text-sm">
                            {item.description}
                          </p>
                        </div>
                      )}
                      {item.errorMessage && (
                        <div className="col-span-2">
                          <span className="text-xs text-destructive">
                            错误信息
                          </span>
                          <p className="text-destructive text-sm font-mono text-xs mt-0.5">
                            {item.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>

                    {onSelect && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-sm text-xs"
                          onClick={() => onSelect(item)}
                        >
                          查看完整详情
                        </Button>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </div>

              {!isLast && <div className="h-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditTrailTimeline;