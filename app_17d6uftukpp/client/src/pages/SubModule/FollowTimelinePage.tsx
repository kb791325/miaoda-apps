import { useState, useMemo } from 'react';
import { List, GitBranch, Clock, User, Target, MessageSquare, ThumbsUp, Phone, Video, Mail, Users as UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { useModuleData } from '@/lib/data-service';
import { formatUserName } from '@/lib/user-names';
import { val } from '@/lib/analytics';
import { formatDisplayValue } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/** 跟进方式图标映射 */
const METHOD_ICON: Record<string, typeof Phone> = {
  '电话': Phone, '微信': MessageSquare, '面谈': UsersIcon, '视频会议': Video, '邮件': Mail, '上门拜访': UsersIcon,
};
const INTENT_COLOR: Record<string, string> = {
  '高': 'text-red-500 bg-red-50 border-red-200',
  '中': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  '低': 'text-blue-500 bg-blue-50 border-blue-200',
  '无': 'text-muted-foreground bg-muted border-border',
};

export default function FollowTimelinePage() {
  const { records, loading } = useModuleData('follow');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const ta = val(a, 'follow', '跟进时间') || val(a, 'follow', '创建时间') || '';
      const tb = val(b, 'follow', '跟进时间') || val(b, 'follow', '创建时间') || '';
      return String(tb).localeCompare(String(ta));
    });
  }, [records]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">跟进记录</h2>
          <p className="mt-1 text-sm text-muted-foreground">客户跟进记录，支持时间线与列表双视图</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-muted p-1">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            className="text-xs"
          >
            <GitBranch className="size-3.5 mr-1" /> 时间线
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="text-xs"
          >
            <List className="size-3.5 mr-1" /> 列表
          </Button>
        </div>
      </div>

      {sortedRecords.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <Clock className="size-8 text-muted-foreground/50" />
            <EmptyTitle>暂无跟进记录</EmptyTitle>
            <EmptyDescription>请先在跟进记录表中维护数据</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === 'timeline' ? (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
          <AnimatePresence>
            <div className="space-y-4">
              {sortedRecords.map((r, i) => {
                const followTime = val(r, 'follow', '跟进时间') || val(r, 'follow', '创建时间') || '';
                const contact = val(r, 'follow', '联系人') || '';
                const method = val(r, 'follow', '跟进方式') || '';
                const intent = val(r, 'follow', '意向度') || '';
                const content = val(r, 'follow', '沟通内容') || '';
                const feedback = val(r, 'follow', '客户反馈') || '';
                const result = val(r, 'follow', '跟进结果') || '';
                const MethodIcon = METHOD_ICON[method] ?? Clock;

                return (
                  <motion.div
                    key={r.recordId}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.03 }}
                    className="flex gap-4"
                  >
                    <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card">
                      <MethodIcon className="size-4 text-primary" />
                    </div>
                    <Card className="flex-1">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-sm font-medium">{formatDisplayValue(followTime)}</span>
                          {contact && <Badge variant="outline" className="text-xs"><User className="size-3 mr-0.5" />{contact}</Badge>}
                          {method && <Badge variant="secondary" className="text-xs">{method}</Badge>}
                          {intent && (
                            <Badge variant="outline" className={cn('text-xs', INTENT_COLOR[intent] ?? '')}>{intent}</Badge>
                          )}
                          {result && <Badge variant="default" className="text-xs">{result}</Badge>}
                        </div>
                        {content && <p className="text-sm text-foreground leading-relaxed">{content}</p>}
                        {feedback && (
                          <div className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                            <ThumbsUp className="size-3 inline mr-1" />客户反馈：{feedback}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium">跟进时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">联系人</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">跟进方式</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">意向度</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">跟进结果</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">沟通内容</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">客户反馈</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((r) => (
                    <tr key={r.recordId} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDisplayValue(val(r, 'follow', '跟进时间') || '')}</td>
                      <td className="px-4 py-2.5">{val(r, 'follow', '联系人') || '—'}</td>
                      <td className="px-4 py-2.5">{val(r, 'follow', '跟进方式') || '—'}</td>
                      <td className="px-4 py-2.5">
                        {val(r, 'follow', '意向度') ? (
                          <Badge variant="outline" className={cn('text-xs', INTENT_COLOR[val(r, 'follow', '意向度')] ?? '')}>
                            {val(r, 'follow', '意向度')}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5">{val(r, 'follow', '跟进结果') || '—'}</td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate">{val(r, 'follow', '沟通内容') || '—'}</td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate">{val(r, 'follow', '客户反馈') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}