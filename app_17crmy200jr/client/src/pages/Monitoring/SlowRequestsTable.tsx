import React from 'react';
import { Snail } from 'lucide-react';
import type { SlowRequestItem } from '@shared/api.interface';

interface SlowRequestsTableProps {
  data: SlowRequestItem[];
  loading: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-600',
  POST: 'text-blue-600',
  PUT: 'text-amber-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-red-600',
};

const SlowRequestsTable: React.FC<SlowRequestsTableProps> = ({
  data,
  loading,
}) => {
  if (loading && data.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-24 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const formatTime = (ts: string): string => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Snail className="size-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-foreground">
          最近慢请求
        </h3>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          暂无慢请求
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Method
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  URL
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  耗时
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  时间
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((req, idx) => {
                const isSlow = req.durationMs > 1000;
                return (
                  <tr
                    key={idx}
                    className="border-b border-border last:border-0 hover:bg-accent/50"
                  >
                    <td className="py-2 px-2">
                      <span
                        className={`text-xs font-semibold ${METHOD_COLORS[req.method] ?? 'text-muted-foreground'}`}
                      >
                        {req.method}
                      </span>
                    </td>
                    <td className="py-2 px-2 max-w-[200px] truncate text-foreground">
                      {req.url}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-mono text-xs ${
                        isSlow ? 'text-red-600 font-bold' : 'text-amber-600'
                      }`}
                      style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
                    >
                      {req.durationMs}ms
                    </td>
                    <td
                      className="py-2 px-2 text-right text-xs text-muted-foreground"
                      style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
                    >
                      {formatTime(req.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SlowRequestsTable;