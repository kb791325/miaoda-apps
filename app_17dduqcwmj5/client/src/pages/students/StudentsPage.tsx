import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import type {
  StudentBitableSyncResponse,
  StudentListItem,
} from '@shared/student';
import {
  ALL_VALUE,
  deleteStudent,
  fetchStudentList,
  syncStudentBitable,
  type StudentListParams,
} from './student.api';
import { GraduationRecordsPanel } from './GraduationRecordsPanel';
import { StudentCreateDialog } from './StudentCreateDialog';
import { StudentDetailSheet } from './StudentDetailSheet';
import { StudentFilterBar } from './StudentFilterBar';
import { StudentTable } from './StudentTable';

const PAGE_SIZE = 20;

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string } };
}

const StudentsPage: React.FC = () => {
  const [paymentStatus, setPaymentStatus] = useState<string>(ALL_VALUE);
  const [channel, setChannel] = useState<string>(ALL_VALUE);
  const [progress, setProgress] = useState<string>(ALL_VALUE);
  const [graduationStatus, setGraduationStatus] =
    useState<string>(ALL_VALUE);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    setPage(1);
  }, [paymentStatus, channel, progress, graduationStatus, keyword]);

  const loadList = useCallback(
    (params: StudentListParams) => {
      let cancelled: boolean = false;
      setLoading(true);
      fetchStudentList(params)
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
        })
        .catch(() => {
          if (cancelled) return;
          setItems([]);
          setTotal(0);
          toast.error('学员列表加载失败，请重试');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [],
  );

  useEffect(() => {
    return loadList({
      paymentStatus: paymentStatus === ALL_VALUE ? undefined : paymentStatus,
      channel: channel === ALL_VALUE ? undefined : channel,
      progress: progress === ALL_VALUE ? undefined : progress,
      graduationStatus:
        graduationStatus === ALL_VALUE ? undefined : graduationStatus,
      keyword: keyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [
    paymentStatus,
    channel,
    progress,
    graduationStatus,
    keyword,
    page,
    loadList,
  ]);

  const refreshList = useCallback(() => {
    loadList({
      paymentStatus: paymentStatus === ALL_VALUE ? undefined : paymentStatus,
      channel: channel === ALL_VALUE ? undefined : channel,
      progress: progress === ALL_VALUE ? undefined : progress,
      graduationStatus:
        graduationStatus === ALL_VALUE ? undefined : graduationStatus,
      keyword: keyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [
    paymentStatus,
    channel,
    progress,
    graduationStatus,
    keyword,
    page,
    loadList,
  ]);

  const handleResync = useCallback(
    async (studentId: string) => {
      setSyncingIds((prev: string[]) => [...prev, studentId]);
      try {
        const result: StudentBitableSyncResponse =
          await syncStudentBitable(studentId);
        if (result.syncStatus === 'synced') {
          toast.success('多维表格同步成功');
          refreshList();
        } else {
          const message: string = result.message ?? '';
          if (
            message.includes('未配置') ||
            message.includes('not configured')
          ) {
            toast.error(
              '多维表格未配置，请在插件管理中配置多维表格插件',
            );
          } else {
            toast.error(message || '多维表格同步失败');
          }
        }
      } catch (error) {
        logger.error('多维表格同步请求失败', error);
        toast.error('多维表格同步失败，请重试');
      } finally {
        setSyncingIds((prev: string[]) =>
          prev.filter((id: string) => id !== studentId),
        );
      }
    },
    [refreshList],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      toast.success('学员已删除');
      setDeleteTarget(null);
      refreshList();
    } catch (error) {
      const apiError: ApiErrorShape = error as ApiErrorShape;
      if (apiError.response?.status === 409) {
        toast.error(
          apiError.response.data?.message ??
            '该学员仍有未清理的关联数据，无法删除',
        );
      } else if (apiError.response?.status === 403) {
        toast.error('仅校长可以删除学员');
      } else {
        toast.error('删除失败，请稍后重试');
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refreshList]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">学员管理</h1>
          <p className="text-sm text-muted-foreground">
            学员台账、报名登记与缴费跟踪
          </p>
        </div>
        <Button
          data-ai-section-type="button"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          新增学员
        </Button>
      </div>
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">学员列表</TabsTrigger>
          <TabsTrigger value="graduation">结业档案</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-0 space-y-4">
          <StudentFilterBar
            paymentStatus={paymentStatus}
            channel={channel}
            progress={progress}
            graduationStatus={graduationStatus}
            keyword={keywordInput}
            onPaymentStatusChange={setPaymentStatus}
            onChannelChange={setChannel}
            onProgressChange={setProgress}
            onGraduationStatusChange={setGraduationStatus}
            onKeywordChange={setKeywordInput}
          />
          <StudentTable
            items={items}
            loading={loading}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onRowClick={setSelectedStudentId}
            syncingIds={syncingIds}
            onResync={handleResync}
            onDelete={setDeleteTarget}
          />
        </TabsContent>
        <TabsContent value="graduation" className="mt-0">
          <GraduationRecordsPanel />
        </TabsContent>
      </Tabs>
      <StudentCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refreshList}
      />
      <StudentDetailSheet
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onListChanged={refreshList}
      />
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除学员</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除学员「{deleteTarget?.studentName}」吗？删除后不可恢复；若该学员仍有考勤记录等关联数据，将无法删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(5_75%_55%)] text-white hover:bg-[hsl(5_75%_48%)]"
              disabled={deleting}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                void handleConfirmDelete();
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

export default StudentsPage;
