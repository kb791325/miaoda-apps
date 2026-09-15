import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/user-names';
import { Camera, Film, Scissors, CheckCircle, Clock, FileText, Users, Package } from 'lucide-react';
import type { IBizRecord } from '@/data/mt-records';

interface VideoDetailTabsProps {
  tabKey: 'progress' | 'deliverables' | 'team';
  record: IBizRecord;
}

const PROGRESS_NODES = [
  { key: 'brief', label: '需求沟通', description: '明确客户需求、脚本方向', icon: FileText },
  { key: 'script', label: '脚本创作', description: '编写分镜脚本与文案', icon: FileText },
  { key: 'shoot', label: '拍摄执行', description: '现场拍摄、素材采集', icon: Camera },
  { key: 'edit', label: '后期剪辑', description: '剪辑、调色、特效', icon: Scissors },
  { key: 'review', label: '审核修改', description: '客户审核、反馈修改', icon: Film },
  { key: 'deliver', label: '交付完成', description: '最终成片交付', icon: CheckCircle },
];

const TEAM: { name: string; role: string; dept: string }[] = [];

const DELIVERABLES: { name: string; size: string; type: string; status: string }[] = [];

/** 视频项目详情专用Tab：节点进度 / 交付物 / 团队成员 */
export default memo(function VideoDetailTabs({ tabKey, record }: VideoDetailTabsProps) {
  const status = String(record.values.status ?? '');

  const progressNodeIndex = () => {
    const idx = PROGRESS_NODES.findIndex((n) => {
      if (status === '已完成') return n.key === 'deliver';
      if (status === '待审核') return n.key === 'review';
      if (status === '后期制作') return n.key === 'edit';
      if (status === '拍摄中') return n.key === 'shoot';
      if (status === '脚本创作') return n.key === 'script';
      if (status === '需求沟通') return n.key === 'brief';
      return true;
    });
    return idx >= 0 ? idx : 0;
  };

  const currentIdx = progressNodeIndex();

  if (tabKey === 'progress') {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-muted-foreground" />
            节点进度时间线
            <Badge variant="secondary" className="ml-1 text-xs font-normal">{status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {PROGRESS_NODES.map((node, idx) => {
              const isDone = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={node.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
                      isDone && 'border-primary bg-primary text-primary-foreground',
                      !isDone && 'border-muted-foreground/30 bg-muted text-muted-foreground',
                    )}>
                      {isDone ? <CheckCircle className="size-3.5" /> : <node.icon className="size-3.5" />}
                    </div>
                    {idx < PROGRESS_NODES.length - 1 && (
                      <div className={cn('h-10 w-0.5', idx < currentIdx ? 'bg-primary' : 'bg-muted-foreground/20')} />
                    )}
                  </div>
                  <div className={cn('min-w-0 pb-4', !isDone && 'opacity-40')}>
                    <p className={cn('text-sm font-medium', isCurrent && 'text-primary')}>{node.label}</p>
                    <p className="text-xs text-muted-foreground">{node.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tabKey === 'deliverables') {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4 text-muted-foreground" />
            交付物
            <Badge variant="secondary" className="ml-1 text-xs font-normal">{DELIVERABLES.length} 个文件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {DELIVERABLES.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无交付物</p>
          ) : (
          <div className="space-y-2">
            {DELIVERABLES.map((d) => (
              <div key={d.name} className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5">
                <span className="text-lg">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.type} · {d.size}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">{d.status}</Badge>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (tabKey === 'team') {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" />
            团队成员
            <Badge variant="secondary" className="ml-1 text-xs font-normal">{TEAM.length} 人</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {TEAM.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无团队成员</p>
          ) : (
          <div className="space-y-2">
            {TEAM.map((m) => (
              <div key={m.name} className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {m.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatUserName(m.name)}</p>
                  <p className="text-xs text-muted-foreground">{m.role} · {m.dept}</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
});