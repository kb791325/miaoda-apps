import React, { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import dayjs from 'dayjs';
import {
  AlertCircle,
  Download,
  PhoneCall,
  PieChart,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { listUsersByIds } from '@client/src/components/business-ui/api/users/service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { retryBitableSync } from '@client/src/api/bitable-retry';
import { formatDateTime, formatPercent } from '@client/src/utils/format';
import { fetchAllPages } from '@client/src/utils/fetch-all';
import type {
  LeadChannelCountItem,
  LeadIntentionCountItem,
  LeadListItem,
  LeadListResponse,
  LeadStatsResponse,
  LeadStatusCountItem,
} from '@shared/lead';
import { LeadFilterBar } from './LeadFilterBar';
import { LeadTable } from './LeadTable';
import {
  LeadFormDialog,
  type LeadEditingSource,
} from './LeadFormDialog';
import { LeadDetailSheet } from './LeadDetailSheet';
import {
  ALL_VALUE,
  deleteLead,
  fetchLeadList,
  fetchLeadStats,
  getApiErrorMessage,
  isForbiddenError,
  SYNC_STATUS_LABEL,
} from './leads.api';

const PAGE_SIZE: number = 20;
const PIE_MAX_CATEGORIES: number = 5;
const PIE_COLORS: string[] = [
  '#f38525',
  '#eea62b',
  '#e85d4a',
  '#2eb85c',
  '#497bdf',
];

interface LeadKpiConfig {
  key: 'total' | 'following' | 'enrolled' | 'conversionRate';
  label: string;
  suffix: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName: string;
}

const LEAD_KPI_CONFIGS: LeadKpiConfig[] = [
  {
    key: 'total',
    label: '线索总数',
    suffix: '条',
    icon: Users,
    iconClassName: 'bg-primary/10 text-primary',
    valueClassName: 'text-foreground',
  },
  {
    key: 'following',
    label: '跟进中',
    suffix: '条',
    icon: PhoneCall,
    iconClassName: 'bg-[hsl(38_85%_55%/0.14)] text-[hsl(38_85%_35%)]',
    valueClassName: 'text-[hsl(38_85%_35%)]',
  },
  {
    key: 'enrolled',
    label: '已报名',
    suffix: '条',
    icon: UserCheck,
    iconClassName: 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_32%)]',
    valueClassName: 'text-[hsl(140_60%_32%)]',
  },
  {
    key: 'conversionRate',
    label: '线索转化率',
    suffix: '',
    icon: UserPlus,
    iconClassName: 'bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_70%_45%)]',
    valueClassName: 'text-[hsl(220_70%_45%)]',
  },
];

function sumStatusCount(
  statusCounts: LeadStatusCountItem[],
  status: string,
): number {
  return statusCounts
    .filter((item: LeadStatusCountItem) => item.status === status)
    .reduce((sum: number, item: LeadStatusCountItem) => sum + item.count, 0);
}

function toPieSlices(
  items: LeadChannelCountItem[],
): LeadChannelCountItem[] {
  if (items.length <= PIE_MAX_CATEGORIES) {
    return items;
  }
  const topSlices: LeadChannelCountItem[] = items.slice(
    0,
    PIE_MAX_CATEGORIES - 1,
  );
  const otherCount: number = items
    .slice(PIE_MAX_CATEGORIES - 1)
    .reduce(
      (sum: number, item: LeadChannelCountItem) => sum + item.count,
      0,
    );
  return [...topSlices, { channel: '其他', count: otherCount }];
}

const LeadsPage: React.FC = () => {
  const [clueStatus, setClueStatus] = useState<string>(ALL_VALUE);
  const [intentionDegree, setIntentionDegree] = useState<string>(ALL_VALUE);
  const [sourceChannel, setSourceChannel] = useState<string>(ALL_VALUE);
  const [personInCharge, setPersonInCharge] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [listResult, setListResult] = useState<LeadListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<LeadStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<LeadEditingSource | null>(null);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadListItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result: LeadListResponse = await fetchLeadList({
        clueStatus: clueStatus === ALL_VALUE ? undefined : clueStatus,
        intentionDegree:
          intentionDegree === ALL_VALUE ? undefined : intentionDegree,
        sourceChannel:
          sourceChannel === ALL_VALUE ? undefined : sourceChannel,
        personInCharge: personInCharge ?? undefined,
        keyword: keyword || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setListResult(result);
    } catch (error) {
      logger.error('线索列表加载失败', error);
      toast.error('线索列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [clueStatus, intentionDegree, sourceChannel, personInCharge, keyword, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const loadStats = useCallback(async (): Promise<void> => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const result: LeadStatsResponse = await fetchLeadStats();
      setStats(result);
    } catch (error) {
      logger.error('线索统计加载失败', error);
      setStatsError('线索统计加载失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refreshAll = useCallback((): void => {
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleResync = useCallback(
    async (leadId: string): Promise<void> => {
      setSyncingIds((prev: string[]) => [...prev, leadId]);
      try {
        await retryBitableSync('lead', leadId);
        toast.success('重新同步完成');
        void loadList();
      } catch (error) {
        logger.error('重新同步失败', error);
        toast.error('重新同步失败，请稍后再试');
      } finally {
        setSyncingIds((prev: string[]) =>
          prev.filter((id: string) => id !== leadId),
        );
      }
    },
    [loadList],
  );

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteLead(deleteTarget.id);
      toast.success('线索已删除');
      if (result.syncStatus === 'failed') {
        toast.warning('线索已删除，但多维表格同步失败');
      }
      setDeleteTarget(null);
      refreshAll();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error(getApiErrorMessage(error, '删除失败，请重试'));
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refreshAll]);

  const resolveManagerNames = async (
    items: LeadListItem[],
  ): Promise<Map<string, string>> => {
    const nameMap: Map<string, string> = new Map();
    const managerIds: string[] = [];
    items.forEach((item: LeadListItem) => {
      if (item.personInCharge && !managerIds.includes(item.personInCharge)) {
        managerIds.push(item.personInCharge);
      }
    });
    if (managerIds.length === 0) {
      return nameMap;
    }
    try {
      const response = await listUsersByIds(managerIds);
      const userList: Array<{ userID?: string; name?: string }> =
        Array.isArray(response)
          ? (response as Array<{ userID?: string; name?: string }>)
          : ((response as { users?: Array<{ userID?: string; name?: string }> })
              .users ?? []);
      userList.forEach((user: { userID?: string; name?: string }) => {
        if (user.userID && user.name) {
          nameMap.set(user.userID, user.name);
        }
      });
    } catch (error) {
      logger.error('导出时解析负责人信息失败', error);
    }
    return nameMap;
  };

  const handleExport = useCallback(async (): Promise<void> => {
    setExporting(true);
    try {
      const items: LeadListItem[] = await fetchAllPages<LeadListItem>(
        (pageNumber: number, pageSize: number) =>
          fetchLeadList({
            clueStatus: clueStatus === ALL_VALUE ? undefined : clueStatus,
            intentionDegree:
              intentionDegree === ALL_VALUE ? undefined : intentionDegree,
            sourceChannel:
              sourceChannel === ALL_VALUE ? undefined : sourceChannel,
            personInCharge: personInCharge ?? undefined,
            keyword: keyword || undefined,
            page: pageNumber,
            pageSize,
          }),
        50,
      );
      const managerNames: Map<string, string> = await resolveManagerNames(
        items,
      );
      const rows: Array<Record<string, string>> = items.map(
        (item: LeadListItem) => ({
          姓名: item.clueName,
          手机号: item.phoneNumber,
          来源渠道: item.sourceChannel ?? '',
          意向课程: item.intendedCourses
            .map((course: { courseName: string }) => course.courseName)
            .join('、'),
          意向度: item.intentionDegree ?? '',
          负责人: item.personInCharge
            ? (managerNames.get(item.personInCharge) ?? item.personInCharge)
            : '',
          线索状态: item.clueStatus ?? '',
          同步状态: SYNC_STATUS_LABEL[item.syncStatus],
          创建时间: formatDateTime(item.createdAt),
        }),
      );
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '招生线索');
      XLSX.writeFile(workbook, `招生线索_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      toast.success(`已导出 ${rows.length} 条线索`);
    } catch (error) {
      logger.error('导出线索失败', error);
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [clueStatus, intentionDegree, sourceChannel, personInCharge, keyword]);

  const kpiValues: Record<LeadKpiConfig['key'], string> = {
    total: String(stats?.total ?? 0),
    following: String(sumStatusCount(stats?.statusCounts ?? [], '跟进中')),
    enrolled: String(sumStatusCount(stats?.statusCounts ?? [], '已报名')),
    conversionRate: stats
      ? formatPercent(stats.conversionRate * 100)
      : formatPercent(0),
  };

  const channelItems: LeadChannelCountItem[] = stats?.channelCounts ?? [];
  const intentionItems: LeadIntentionCountItem[] =
    stats?.intentionCounts ?? [];
  const intentionTotal: number = intentionItems.reduce(
    (sum: number, item: LeadIntentionCountItem) => sum + item.count,
    0,
  );

  const pieOption: EChartsOption = {
    color: PIE_COLORS,
    tooltip: {
      trigger: 'item',
      formatter: (params: TopLevelFormatterParams) => {
        const point = Array.isArray(params) ? params[0] : params;
        const value: number = Number(point.value);
        const percent: string = formatPercent(point.percent);
        return `${point.marker}${point.name}: ${value} 条 (${percent})`;
      },
    },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        name: '来源渠道',
        type: 'pie',
        radius: ['40%', '62%'],
        center: ['50%', '44%'],
        data: toPieSlices(channelItems).map(
          (slice: LeadChannelCountItem) => ({
            name: slice.channel,
            value: slice.count,
          }),
        ),
        label: { show: false },
        emphasis: { label: { show: false } },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">招生线索管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            线索录入、跟进与报名转化全流程管理
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            data-ai-section-type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? '导出中...' : '导出'}
          </Button>
          <Button
            data-ai-section-type="button"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            新增线索
          </Button>
        </div>
      </div>

      {statsError && !statsLoading ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-[hsl(5_75%_40%)]">
              <AlertCircle className="size-4 shrink-0" />
              <span>{statsError}，指标卡暂不可用</span>
            </div>
            <Button
              data-ai-section-type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadStats()}
            >
              重试
            </Button>
          </div>
        </Card>
      ) : (
      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {LEAD_KPI_CONFIGS.map((config: LeadKpiConfig) => {
          const IconComponent: LucideIcon = config.icon;
          return (
            <Card key={config.key} className="p-6">
              {statsLoading ? (
                <>
                  <Skeleton className="mb-3 size-10 rounded-lg" />
                  <Skeleton className="mb-2 h-8 w-20" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <div className="flex items-start gap-4">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${config.iconClassName}`}
                  >
                    <IconComponent className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-2xl font-bold ${config.valueClassName}`}>
                      {kpiValues[config.key]}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {config.suffix}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {config.label}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-lg lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">
              渠道来源分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : channelItems.length === 0 ? (
              <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <PieChart className="h-8 w-8" />
                <p className="text-sm">暂无渠道数据</p>
              </div>
            ) : (
              <ReactECharts option={pieOption} theme="ud" className="h-[300px]" />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">意向度分布</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : intentionItems.length === 0 ? (
              <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
                暂无意向度数据
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {intentionItems.map((item: LeadIntentionCountItem) => {
                  const percent: number =
                    intentionTotal > 0
                      ? Math.round((item.count / intentionTotal) * 100)
                      : 0;
                  return (
                    <div key={item.intentionDegree}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          意向度：{item.intentionDegree}
                        </span>
                        <span className="text-muted-foreground">
                          {item.count} 条 · {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LeadFilterBar
        clueStatus={clueStatus}
        intentionDegree={intentionDegree}
        sourceChannel={sourceChannel}
        personInCharge={personInCharge}
        keyword={keywordInput}
        onClueStatusChange={(value: string) => {
          setClueStatus(value);
          setPage(1);
        }}
        onIntentionDegreeChange={(value: string) => {
          setIntentionDegree(value);
          setPage(1);
        }}
        onSourceChannelChange={(value: string) => {
          setSourceChannel(value);
          setPage(1);
        }}
        onPersonInChargeChange={(value: string | null) => {
          setPersonInCharge(value);
          setPage(1);
        }}
        onKeywordChange={setKeywordInput}
      />

      <LeadTable
        items={listResult?.items ?? []}
        loading={loading}
        total={listResult?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={setDetailLeadId}
        syncingIds={syncingIds}
        onResync={(leadId: string) => void handleResync(leadId)}
        onDelete={setDeleteTarget}
      />

      <LeadFormDialog
        open={createOpen || editing !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        onSuccess={refreshAll}
        editing={editing}
      />

      <LeadDetailSheet
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onListChanged={refreshAll}
        onEdit={(detail) => {
          setEditing({ lead: detail.lead, courses: detail.courses });
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除线索</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除线索「{deleteTarget?.clueName ?? ''}」？删除后将同步移除多维表格记录，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadsPage;
