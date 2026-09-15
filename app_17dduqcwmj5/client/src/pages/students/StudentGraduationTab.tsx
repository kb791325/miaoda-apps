import React, { useCallback, useEffect, useState } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { retryBitableSync } from '@client/src/api/bitable-retry';
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
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Progress } from '@client/src/components/ui/progress';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { APP_ROLES } from '@shared/roles';
import { CERT_ISSUANCE_ISSUED } from '@shared/graduation';
import type { GraduationRecordItem } from '@shared/graduation';
import { formatPercent } from '@client/src/utils/format';
import {
  fetchGraduationList,
  issueGraduationCertificate,
} from './graduation.api';
import { GraduationFormDialog } from './GraduationFormDialog';
import {
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from './student.api';

interface StudentGraduationTabProps {
  studentId: string;
  onChanged: () => void;
}

const EMPTY_TEXT = '-';

export const StudentGraduationTab: React.FC<StudentGraduationTabProps> = ({
  studentId,
  onChanged,
}) => {
  const [records, setRecords] = useState<GraduationRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [issueTarget, setIssueTarget] =
    useState<GraduationRecordItem | null>(null);
  const [issuing, setIssuing] = useState<boolean>(false);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  const loadRecords = useCallback(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetchGraduationList({ studentId, pageSize: 50 })
      .then((result) => {
        if (!cancelled) setRecords(result.items);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => loadRecords(), [loadRecords]);

  const handleConfirmIssue = useCallback(async () => {
    if (!issueTarget) return;
    setIssuing(true);
    try {
      const result = await issueGraduationCertificate(issueTarget.id);
      toast.success('发证成功，学员状态已更新为已结业');
      if (result.syncStatus === 'failed') {
        toast.warning('档案已更新，但同步多维表格失败，可稍后重试');
      }
      setIssueTarget(null);
      loadRecords();
      onChanged();
    } catch (error) {
      logger.error('发证请求失败', error);
      toast.error('发证失败，请重试');
    } finally {
      setIssuing(false);
    }
  }, [issueTarget, loadRecords, onChanged]);

  const handleRetrySync = useCallback(
    async (recordId: string) => {
      setSyncingIds((prev: string[]) => [...prev, recordId]);
      try {
        const result = await retryBitableSync('graduation', recordId);
        if (result.syncStatus === 'synced') {
          toast.success('多维表格同步成功');
          loadRecords();
        } else {
          toast.error(result.message || '多维表格同步失败');
        }
      } catch (error) {
        logger.error('多维表格同步重试失败', error);
        toast.error('多维表格同步失败，请重试');
      } finally {
        setSyncingIds((prev: string[]) =>
          prev.filter((id: string) => id !== recordId),
        );
      }
    },
    [loadRecords],
  );

  const handleFormSaved = useCallback(() => {
    loadRecords();
    onChanged();
  }, [loadRecords, onChanged]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <Award className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          该学员暂无结业档案
        </p>
        <CanRole
          roles={[
            APP_ROLES.principal,
            APP_ROLES.recruitmentTeacher,
            APP_ROLES.teachingTeacher,
          ]}
          fallback={null}
        >
          <Button
            data-ai-section-type="button"
            className="mt-4"
            size="sm"
            onClick={() => setFormOpen(true)}
          >
            登记结业
          </Button>
        </CanRole>
        <GraduationFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          studentId={studentId}
          onSaved={handleFormSaved}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record: GraduationRecordItem) => {
        const isSyncing: boolean = syncingIds.includes(record.id);
        return (
          <div
            key={record.id}
            className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">证书编号</p>
                <p className="text-lg font-bold tracking-wide text-primary">
                  {record.graduationCertNo ?? EMPTY_TEXT}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={
                    record.certificateIssuanceStatus === CERT_ISSUANCE_ISSUED
                      ? 'border-[hsl(140_60%_45%/0.4)] bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]'
                      : 'border-[hsl(38_85%_55%/0.4)] bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]'
                  }
                >
                  {record.certificateIssuanceStatus}
                </Badge>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSyncStatusBadgeClass(record.syncStatus)}`}
                >
                  {SYNC_STATUS_LABEL[record.syncStatus]}
                </span>
                {record.syncStatus === 'failed' && (
                  <Button
                    data-ai-section-type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs text-primary"
                    disabled={isSyncing}
                    onClick={() => handleRetrySync(record.id)}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
                    />
                    {isSyncing ? '同步中' : '重新同步'}
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">结业课程</p>
                <div className="flex flex-wrap gap-1">
                  {record.courses.length === 0 ? (
                    <span>{EMPTY_TEXT}</span>
                  ) : (
                    record.courses.map((course) => (
                      <Badge key={course.id} variant="secondary">
                        {course.courseName || EMPTY_TEXT}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">结业日期</p>
                <p className="font-medium">
                  {record.graduationDate ?? EMPTY_TEXT}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">培训周期</p>
                <p className="font-medium">
                  {record.trainingStartDate ?? EMPTY_TEXT} ~{' '}
                  {record.trainingEndDate ?? EMPTY_TEXT}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">课时情况</p>
                <p className="font-medium">
                  出勤 {record.attendanceHours} / 总 {record.totalClassHours}{' '}
                  课时
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>出勤率</span>
                <span className="font-medium text-foreground">
                  {formatPercent(record.attendanceRate)}
                </span>
              </div>
              <Progress value={Math.min(record.attendanceRate, 100)} />
            </div>
            {record.practicalEvaluation && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">实操评价</p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {record.practicalEvaluation}
                </p>
              </div>
            )}
            {record.theoreticalEvaluation && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">理论评价</p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {record.theoreticalEvaluation}
                </p>
              </div>
            )}
            {record.certificateIssuanceStatus !== CERT_ISSUANCE_ISSUED && (
              <CanRole
                roles={[
                  APP_ROLES.principal,
                  APP_ROLES.recruitmentTeacher,
                  APP_ROLES.teachingTeacher,
                ]}
                fallback={null}
              >
                <Button
                  data-ai-section-type="button"
                  size="sm"
                  onClick={() => setIssueTarget(record)}
                >
                  <Award className="mr-1 h-3.5 w-3.5" />
                  发证
                </Button>
              </CanRole>
            )}
          </div>
        );
      })}
      <AlertDialog
        open={issueTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setIssueTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认证书发放</AlertDialogTitle>
            <AlertDialogDescription>
              确定向该学员发放结业证书「{issueTarget?.graduationCertNo}
              」吗？发证后学员学习进度将更新为已结业。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={issuing}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                void handleConfirmIssue();
              }}
            >
              {issuing ? '发证中...' : '确认发证'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
