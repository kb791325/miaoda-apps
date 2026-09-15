import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Send, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Separator } from '@client/src/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@client/src/components/ui/sheet';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Textarea } from '@client/src/components/ui/textarea';
import { formatDateTime } from '@client/src/utils/format';
import type {
  CreateFollowUpRequest,
  FollowUpRecordItem,
  LeadCourseRef,
  LeadDetailResponse,
} from '@shared/lead';
import {
  convertLead,
  createFollowUp,
  fetchLeadDetail,
  FOLLOW_UP_METHOD_OPTIONS,
  getApiErrorMessage,
  getClueStatusBadgeClass,
  getIntentionBadgeClass,
  isForbiddenError,
} from './leads.api';

interface LeadDetailSheetProps {
  leadId: string | null;
  onClose: () => void;
  onListChanged: () => void;
  onEdit: (detail: LeadDetailResponse) => void;
}

interface InfoItemProps {
  label: string;
  value?: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-medium">
      {value === undefined || value === null || value === '' ? '-' : value}
    </div>
  </div>
);

const EMPTY_TEXT = '-';

export const LeadDetailSheet: React.FC<LeadDetailSheetProps> = ({
  leadId,
  onClose,
  onListChanged,
  onEdit,
}) => {
  const [detail, setDetail] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [followContent, setFollowContent] = useState<string>('');
  const [followMethod, setFollowMethod] = useState<string>('电话');
  const [followPlan, setFollowPlan] = useState<string>('');
  const [followSubmitting, setFollowSubmitting] = useState<boolean>(false);
  const [converting, setConverting] = useState<boolean>(false);

  const loadDetail = useCallback((id: string) => {
    let cancelled: boolean = false;
    setLoading(true);
    setLoadError(false);
    fetchLeadDetail(id)
      .then((result: LeadDetailResponse) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        logger.error('加载线索详情失败', error);
        if (!cancelled) {
          setDetail(null);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leadId) {
      setDetail(null);
      setFollowContent('');
      setFollowMethod('电话');
      setFollowPlan('');
      return;
    }
    return loadDetail(leadId);
  }, [leadId, loadDetail]);

  const handleFollowSubmit = useCallback(async () => {
    if (!leadId) return;
    if (!followContent.trim()) {
      toast.error('请填写跟进内容');
      return;
    }
    setFollowSubmitting(true);
    try {
      const request: CreateFollowUpRequest = {
        followUpContent: followContent.trim(),
        followUpMethod: followMethod,
        nextFollowUpPlan: followPlan.trim() || undefined,
      };
      const result = await createFollowUp(leadId, request);
      toast.success('跟进记录已添加');
      if (
        result.syncStatus === 'failed' ||
        result.leadSyncStatus === 'failed'
      ) {
        toast.warning('跟进已保存，但同步多维表格失败，可稍后在列表中重新同步');
      }
      setFollowContent('');
      setFollowPlan('');
      loadDetail(leadId);
      onListChanged();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error('跟进记录添加失败，请重试');
      }
      logger.error('新增跟进失败', error);
    } finally {
      setFollowSubmitting(false);
    }
  }, [leadId, followContent, followMethod, followPlan, loadDetail, onListChanged]);

  const handleConvert = useCallback(async () => {
    if (!leadId || !detail) return;
    setConverting(true);
    try {
      const result = await convertLead(leadId);
      toast.success(`线索「${detail.lead.clueName}」已转为学员`);
      if (result.syncStatus === 'failed' || result.leadSyncStatus === 'failed') {
        toast.warning('转化成功，但同步多维表格失败，可稍后重新同步');
      }
      loadDetail(leadId);
      onListChanged();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error(getApiErrorMessage(error, '转学员失败，请重试'));
      }
    } finally {
      setConverting(false);
    }
  }, [leadId, detail, loadDetail, onListChanged]);

  const isEnrolled: boolean = detail?.lead.clueStatus === '已报名';

  return (
    <Sheet
      open={leadId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {loading ? (
          <div className="space-y-4 pt-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : loadError || !detail ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <p className="text-sm text-muted-foreground">
              线索详情加载失败，请稍后重试
            </p>
            {leadId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => loadDetail(leadId)}
              >
                重新加载
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{detail.lead.clueName || EMPTY_TEXT}</SheetTitle>
              <SheetDescription>
                线索档案、跟进时间线与转学员操作
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">基本信息</h3>
                  <Button
                    data-ai-section-type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(detail)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    编辑
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem
                    label="联系电话"
                    value={detail.lead.phoneNumber}
                  />
                  <InfoItem
                    label="来源渠道"
                    value={detail.lead.sourceChannel}
                  />
                  <InfoItem
                    label="意向度"
                    value={
                      detail.lead.intentionDegree ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getIntentionBadgeClass(detail.lead.intentionDegree)}`}
                        >
                          {detail.lead.intentionDegree}
                        </span>
                      ) : (
                        EMPTY_TEXT
                      )
                    }
                  />
                  <InfoItem
                    label="线索状态"
                    value={
                      detail.lead.clueStatus ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getClueStatusBadgeClass(detail.lead.clueStatus)}`}
                        >
                          {detail.lead.clueStatus}
                        </span>
                      ) : (
                        EMPTY_TEXT
                      )
                    }
                  />
                  <InfoItem
                    label="首次咨询时间"
                    value={formatDateTime(detail.lead.firstConsultTime)}
                  />
                  <InfoItem
                    label="下次跟进时间"
                    value={formatDateTime(detail.lead.nextFollowTime)}
                  />
                  <InfoItem
                    label="负责人"
                    value={
                      detail.lead.personInCharge ? (
                        <UserDisplay
                          value={[detail.lead.personInCharge]}
                          size="small"
                        />
                      ) : (
                        EMPTY_TEXT
                      )
                    }
                  />
                  <InfoItem
                    label="意向课程"
                    value={
                      detail.courses.length > 0
                        ? detail.courses
                            .map((course: LeadCourseRef) => course.courseName)
                            .join('、')
                        : EMPTY_TEXT
                    }
                  />
                </div>
                {detail.lead.remark && (
                  <InfoItem label="备注" value={detail.lead.remark} />
                )}
                {!isEnrolled && (
                  <Button
                    data-ai-section-type="button"
                    className="w-full"
                    disabled={converting}
                    onClick={() => void handleConvert()}
                  >
                    <UserRoundCheck className="mr-2 h-4 w-4" />
                    {converting ? '转化中...' : '转为学员'}
                  </Button>
                )}
                {isEnrolled && (
                  <p className="text-xs text-muted-foreground">
                    该线索已报名，已完成学员转化
                  </p>
                )}
              </section>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">新增跟进</h3>
                <Textarea
                  placeholder="请填写本次跟进内容"
                  value={followContent}
                  onChange={(
                    event: React.ChangeEvent<HTMLTextAreaElement>,
                  ) => setFollowContent(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={followMethod} onValueChange={setFollowMethod}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="跟进方式" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOW_UP_METHOD_OPTIONS.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="min-w-40 flex-1"
                    placeholder="下次跟进计划，如 2026-09-10 电话回访"
                    value={followPlan}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                    ) => setFollowPlan(event.target.value)}
                  />
                  <Button
                    data-ai-section-type="button"
                    size="sm"
                    disabled={followSubmitting}
                    onClick={() => void handleFollowSubmit()}
                  >
                    <Send className="mr-1 h-3.5 w-3.5" />
                    {followSubmitting ? '提交中...' : '提交跟进'}
                  </Button>
                </div>
              </section>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">
                  跟进时间线（{detail.followUps.length}）
                </h3>
                {detail.followUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    暂无跟进记录
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detail.followUps.map((record: FollowUpRecordItem) => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {record.followUpMethod ?? '其他'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(record.followUpTime)}
                          </span>
                          {record.follower && (
                            <UserDisplay value={[record.follower]} size="small" />
                          )}
                        </div>
                        <p className="mt-2 break-words text-sm">
                          {record.followUpContent ?? EMPTY_TEXT}
                        </p>
                        {record.nextFollowUpPlan && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            下次计划：{record.nextFollowUpPlan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
