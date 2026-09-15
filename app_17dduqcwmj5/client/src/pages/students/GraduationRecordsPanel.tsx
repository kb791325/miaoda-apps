import React, { useCallback, useEffect, useState } from 'react';
import { Award, RefreshCw, Search } from 'lucide-react';
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
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { PaginationBar } from '@client/src/components/PaginationBar';
import { formatPercent } from '@client/src/utils/format';
import { APP_ROLES } from '@shared/roles';
import { CERT_ISSUANCE_ISSUED } from '@shared/graduation';
import type { GraduationRecordItem } from '@shared/graduation';
import {
  fetchGraduationList,
  issueGraduationCertificate,
} from './graduation.api';
import {
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from './student.api';

const PAGE_SIZE = 20;
const EMPTY_TEXT = '-';

const COLUMN_COUNT = 8;

export const GraduationRecordsPanel: React.FC = () => {
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<GraduationRecordItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [issueTarget, setIssueTarget] =
    useState<GraduationRecordItem | null>(null);
  const [issuing, setIssuing] = useState<boolean>(false);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const loadList = useCallback(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetchGraduationList({
      keyword: keyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        toast.error('结业档案列表加载失败，请重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, page]);

  useEffect(() => loadList(), [loadList]);

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
      loadList();
    } catch (error) {
      logger.error('发证请求失败', error);
      toast.error('发证失败，请重试');
    } finally {
      setIssuing(false);
    }
  }, [issueTarget, loadList]);

  const handleRetrySync = useCallback(
    async (recordId: string) => {
      setSyncingIds((prev: string[]) => [...prev, recordId]);
      try {
        const result = await retryBitableSync('graduation', recordId);
        if (result.syncStatus === 'synced') {
          toast.success('多维表格同步成功');
          loadList();
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
    [loadList],
  );

  const totalPages: number = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card className="rounded-lg p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索学员姓名 / 证书编号"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
          />
        </div>
      </Card>
      <Card className="rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>证书编号</TableHead>
              <TableHead>学员</TableHead>
              <TableHead>结业课程</TableHead>
              <TableHead>出勤率</TableHead>
              <TableHead>结业日期</TableHead>
              <TableHead>发证状态</TableHead>
              <TableHead>同步状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map(
                (_item: unknown, index: number) => (
                  <TableRow key={index}>
                    {Array.from({ length: COLUMN_COUNT }).map(
                      (_cell: unknown, cellIndex: number) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ),
              )
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="h-32 text-center text-muted-foreground"
                >
                  暂无结业档案数据
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: GraduationRecordItem) => {
                const isSyncing: boolean = syncingIds.includes(item.id);
                return (
                  <TableRow key={item.id} className="even:bg-muted/30">
                    <TableCell className="font-medium text-primary">
                      {item.graduationCertNo ?? EMPTY_TEXT}
                    </TableCell>
                    <TableCell>{item.studentName || EMPTY_TEXT}</TableCell>
                    <TableCell>
                      {item.courses.length === 0
                        ? EMPTY_TEXT
                        : item.courses
                            .map((course) => course.courseName || EMPTY_TEXT)
                            .join('、')}
                    </TableCell>
                    <TableCell>
                      {formatPercent(item.attendanceRate)}
                    </TableCell>
                    <TableCell>{item.graduationDate ?? EMPTY_TEXT}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.certificateIssuanceStatus ===
                          CERT_ISSUANCE_ISSUED
                            ? 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]'
                            : 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]'
                        }`}
                      >
                        {item.certificateIssuanceStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSyncStatusBadgeClass(item.syncStatus)}`}
                        >
                          {SYNC_STATUS_LABEL[item.syncStatus]}
                        </span>
                        {item.syncStatus === 'failed' && (
                          <Button
                            data-ai-section-type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs text-primary"
                            disabled={isSyncing}
                            onClick={() => handleRetrySync(item.id)}
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
                            />
                            {isSyncing ? '同步中' : '重新同步'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.certificateIssuanceStatus !==
                        CERT_ISSUANCE_ISSUED && (
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
                            variant="outline"
                            size="sm"
                            onClick={() => setIssueTarget(item)}
                          >
                            <Award className="mr-1 h-3.5 w-3.5" />
                            发证
                          </Button>
                        </CanRole>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!loading && total > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            unit="份档案"
            onChange={setPage}
            className="border-t px-4 py-3"
          />
        )}
      </Card>
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
              确定向学员「{issueTarget?.studentName}」发放结业证书「
              {issueTarget?.graduationCertNo}」吗？发证后学员学习进度将更新为已结业。
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
