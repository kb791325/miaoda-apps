import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Activity,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Target,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent } from '@client/src/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import * as auditLogsApi from '@client/src/api/audit-logs';
import {
  buildTrendOption,
  buildModulePieOption,
  buildTypeBarOption,
} from './audit-stats.charts';
import {
  getTypeBadge,
} from './audit-log.constants';
import type {
  AuditLogStats,
  AuditTrendItem,
  AuditTypeDistribution,
  AuditModuleDistribution,
  AuditUserStat,
  AuditTopTarget,
  AuditLogItem,
} from '@shared/api.interface';

// ============ 工具函数 ============

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============ 页面组件 ============

const AuditStatsPage = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [trend, setTrend] = useState<AuditTrendItem[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<AuditTypeDistribution[]>([]);
  const [moduleDistribution, setModuleDistribution] = useState<AuditModuleDistribution[]>([]);
  const [topUsers, setTopUsers] = useState<AuditUserStat[]>([]);
  const [topTargets, setTopTargets] = useState<AuditTopTarget[]>([]);
  const [failureItems, setFailureItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);
  const [rangeLabel, setRangeLabel] = useState('近30天');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes, trendRes, typeRes, moduleRes,
        userRes, targetRes, failureRes,
      ] = await Promise.all([
        auditLogsApi.getAuditStats(),
        auditLogsApi.getAuditTrend({ days: rangeDays }),
        auditLogsApi.getOperationTypeDistribution(),
        auditLogsApi.getModuleDistribution(),
        auditLogsApi.getUserStats({ limit: 10 }),
        auditLogsApi.getTopTargets({ limit: 10 }),
        auditLogsApi.getAuditLogs({ status: 'failure', pageSize: 10, page: 1 }),
      ]);
      setStats(statsRes);
      setTrend(trendRes);
      setTypeDistribution(typeRes);
      setModuleDistribution(moduleRes);
      setTopUsers(userRes);
      setTopTargets(targetRes);
      setFailureItems(failureRes.items ?? []);
    } catch (err: unknown) {
      logger.error('获取审计统计失败', err);
      toast.error('获取审计统计失败');
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statCards = [
    { label: '总操作数', value: stats?.totalOperations ?? 0, icon: Activity, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: '成功操作', value: stats?.successCount ?? 0, icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10' },
    { label: '失败操作', value: stats?.failureCount ?? 0, icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: '今日操作', value: stats?.todayOperations ?? 0, icon: Calendar, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">审计统计</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-ai-section-type="card-stat">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-sm shadow-none">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex size-10 items-center justify-center rounded-sm ${card.bgColor}`}>
                  <Icon className={`size-5 ${card.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <span className="text-2xl font-semibold text-foreground font-mono">{card.value.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 日期范围快捷选择 */}
      <div className="flex items-center gap-2">
        {[
          { label: '今日', days: 1 },
          { label: '本周', days: 7 },
          { label: '本月', days: 30 },
          { label: '近30天', days: 30 },
        ].map((opt) => (
          <Button
            key={opt.label}
            variant={rangeLabel === opt.label ? 'default' : 'outline'}
            size="sm"
            className="h-7 rounded-sm text-xs"
            onClick={() => { setRangeDays(opt.days); setRangeLabel(opt.label); }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-sm shadow-none">
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />操作趋势（{rangeLabel}）
            </h2>
            <ReactECharts option={buildTrendOption(trend)} theme="ud" className="h-[300px]" />
          </CardContent>
        </Card>
        <Card className="rounded-sm shadow-none">
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
              <PieChart className="size-4 text-primary" />模块操作分布
            </h2>
            <ReactECharts option={buildModulePieOption(moduleDistribution)} theme="ud" className="h-[300px]" />
          </CardContent>
        </Card>
      </div>

      {/* 操作类型分布 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />操作类型分布
          </h2>
          <ReactECharts option={buildTypeBarOption(typeDistribution)} theme="ud" className="h-[300px]" />
        </CardContent>
      </Card>

      {/* 表格行 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 活跃用户 */}
        <Card className="rounded-sm shadow-none">
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" />活跃用户 TOP10
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground w-12">#</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">用户</TableHead>
                  <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">操作数</TableHead>
                  <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">成功率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {topUsers.map((u: AuditUserStat, i: number) => {
                    const rate = u.count > 0 ? ((u.successCount / u.count) * 100).toFixed(1) : '0.0';
                    const rateNum = Number(rate);
                    const rankColors: Record<number, string> = {
                      0: 'text-amber-500 font-bold',
                      1: 'text-slate-400 font-bold',
                      2: 'text-amber-700 font-bold',
                    };
                    const rankClass = rankColors[i] ?? 'text-muted-foreground';
                    return (
                      <TableRow key={u.userId} className="hover:bg-accent">
                        <TableCell className={`h-10 text-sm font-mono ${rankClass}`}>{i + 1}</TableCell>
                        <TableCell className="h-10 text-sm text-foreground">{u.userName || u.userId}</TableCell>
                        <TableCell className="h-10 text-right text-sm font-mono text-foreground">{u.count.toLocaleString()}</TableCell>
                        <TableCell className="h-10 text-right">
                          <Badge variant="outline" className={`rounded-sm text-xs ${rateNum >= 95 ? 'border-green-200 bg-green-50 text-green-700' : rateNum >= 80 ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{rate}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {topUsers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 热门对象 */}
        <Card className="rounded-sm shadow-none">
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="size-4 text-primary" />热门操作对象 TOP10
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground w-12">#</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">对象</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">类型</TableHead>
                  <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">操作数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {topTargets.map((t: AuditTopTarget, i: number) => {
                    const rankColors: Record<number, string> = {
                      0: 'text-amber-500 font-bold',
                      1: 'text-slate-400 font-bold',
                      2: 'text-amber-700 font-bold',
                    };
                    const rankClass = rankColors[i] ?? 'text-muted-foreground';
                    return (
                      <TableRow key={`${t.targetType}-${t.targetId}`} className="hover:bg-accent">
                        <TableCell className={`h-10 text-sm font-mono ${rankClass}`}>{i + 1}</TableCell>
                        <TableCell className="h-10 text-sm font-mono text-foreground">{t.targetName || t.targetId}</TableCell>
                        <TableCell className="h-10 text-sm text-muted-foreground">{t.targetType}</TableCell>
                        <TableCell className="h-10 text-right text-sm font-mono text-foreground">{t.count.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                {topTargets.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 失败操作 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />最近失败操作
          </h2>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">时间</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">用户</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">模块</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">操作</TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">错误信息</TableHead>
                  <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failureItems.map((log: AuditLogItem) => {
                  const fb = getTypeBadge(log.operationType);
                  return (
                    <TableRow key={log.id} className="hover:bg-accent">
                      <TableCell className="h-10 text-sm font-mono text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell className="h-10 text-sm text-foreground"><span className="font-mono text-xs">{log.operatorName || log.operator || '—'}</span></TableCell>
                      <TableCell className="h-10 text-sm text-foreground">{log.module || '—'}</TableCell>
                      <TableCell className="h-10 text-sm">
                        <Badge variant="outline" className={`rounded-sm text-xs ${fb.className}`}>{fb.label}</Badge>
                      </TableCell>
                      <TableCell className="h-10 text-sm text-destructive max-w-[200px] truncate">{log.errorMessage || '—'}</TableCell>
                      <TableCell className="h-10 text-right">
                        <Button variant="ghost" size="sm" className="h-7 rounded-sm text-xs" onClick={() => navigate(`/audit-logs/${log.id}`)}><Eye className="mr-1 size-3.5" />详情</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {failureItems.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-16 text-center text-sm text-muted-foreground">暂无失败操作</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditStatsPage;