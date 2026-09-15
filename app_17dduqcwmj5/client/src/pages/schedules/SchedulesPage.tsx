import React, { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Download, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { APP_ROLES } from '@shared/roles';
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
import type { CourseListItem, CourseListResponse } from '@shared/course';
import type {
  ScheduleBitableSyncResponse,
  ScheduleListItem,
} from '@shared/schedule';
import { fetchAllPages } from '@client/src/utils/fetch-all';
import { fetchCourseList } from '../courses/course.api';
import { AttendanceSheet } from './AttendanceSheet';
import { BatchRollCallDialog } from './BatchRollCallDialog';
import { CreateScheduleDialog } from './CreateScheduleDialog';
import { EnrolledStudentsDialog } from './EnrolledStudentsDialog';
import { LeavePanel } from './LeavePanel';
import {
  EMPTY_SCHEDULE_FILTERS,
  ScheduleFilterBar,
  type ScheduleFilters,
} from './ScheduleFilterBar';
import { ScheduleTable } from './ScheduleTable';
import {
  deleteSchedule,
  fetchScheduleList,
  getErrorMessage,
  syncScheduleBitable,
  type ScheduleListParams,
} from './schedule.api';

const PAGE_SIZE: number = 20;
const EXPORT_PAGE_SIZE: number = 500;

const SCHEDULE_WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

interface ApiErrorShape {
  response?: { status?: number };
}

const SchedulesPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [filters, setFilters] = useState<ScheduleFilters>(
    EMPTY_SCHEDULE_FILTERS,
  );
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<ScheduleListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [attendanceSchedule, setAttendanceSchedule] =
    useState<ScheduleListItem | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleListItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [studentsSchedule, setStudentsSchedule] =
    useState<ScheduleListItem | null>(null);
  const [studentsOpen, setStudentsOpen] = useState<boolean>(false);
  const [rollCallSchedule, setRollCallSchedule] =
    useState<ScheduleListItem | null>(null);
  const [rollCallOpen, setRollCallOpen] = useState<boolean>(false);

  useEffect(() => {
    let cancelled: boolean = false;
    fetchAllPages<CourseListItem>(
      async (
        page: number,
        pageSize: number,
      ): Promise<CourseListResponse> => fetchCourseList({ page, pageSize }),
    )
      .then((items: CourseListItem[]) => {
        if (!cancelled) {
          setCourses(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('加载课程列表失败');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSchedules = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchScheduleList({
        courseId: filters.courseId === '' ? undefined : filters.courseId,
        status: filters.status === '' ? undefined : filters.status,
        dateFrom: filters.dateFrom
          ? dayjs(filters.dateFrom).format('YYYY-MM-DD')
          : undefined,
        dateTo: filters.dateTo
          ? dayjs(filters.dateTo).add(1, 'day').format('YYYY-MM-DD')
          : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setForbidden(result.forbidden);
      setItems(result.items);
      setTotal(result.total);
    } catch {
      toast.error('加载排期列表失败');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const handleFiltersChange = (next: ScheduleFilters): void => {
    setFilters(next);
    setPage(1);
  };

  const handleViewAttendance = (item: ScheduleListItem): void => {
    setAttendanceSchedule(item);
    setAttendanceOpen(true);
  };

  const handleViewStudents = (item: ScheduleListItem): void => {
    setStudentsSchedule(item);
    setStudentsOpen(true);
  };

  const handleBatchAttendance = (item: ScheduleListItem): void => {
    setRollCallSchedule(item);
    setRollCallOpen(true);
  };

  const handleExport = useCallback(async (): Promise<void> => {
    setExporting(true);
    try {
      const baseParams: ScheduleListParams = {
        courseId: filters.courseId === '' ? undefined : filters.courseId,
        status: filters.status === '' ? undefined : filters.status,
        dateFrom: filters.dateFrom
          ? dayjs(filters.dateFrom).format('YYYY-MM-DD')
          : undefined,
        dateTo: filters.dateTo
          ? dayjs(filters.dateTo).add(1, 'day').format('YYYY-MM-DD')
          : undefined,
      };
      const allItems: ScheduleListItem[] =
        await fetchAllPages<ScheduleListItem>(
          (page: number, pageSize: number) =>
            fetchScheduleList({ ...baseParams, page, pageSize }),
          EXPORT_PAGE_SIZE,
        );
      if (allItems.length === 0) {
        toast.error('当前筛选条件下暂无可导出的排期数据');
        return;
      }
      const rows: Record<string, string | number | null>[] = allItems.map(
        (item: ScheduleListItem) => ({
          排期名称: item.scheduleName || '未命名排期',
          课程: item.courseName || '',
          上课日期: item.classDate ?? '',
          时间: `${item.startTime ?? '--:--'} ~ ${item.endTime ?? '--:--'}`,
          讲师: item.lecturerName || '',
          教室: item.classroom ?? '',
          容量: item.enrollmentCapacity,
          已报名: item.registeredCount,
          状态: item.status ?? '',
        }),
      );
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '排期列表');
      const fileName: string = `排期列表-${dayjs().format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(`已导出 ${rows.length} 条排期`);
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleRetrySync = async (item: ScheduleListItem): Promise<void> => {
    setRetryingId(item.id);
    try {
      const result: ScheduleBitableSyncResponse = await syncScheduleBitable(
        item.id,
      );
      if (result.syncStatus === 'synced') {
        toast.success('同步多维表格成功');
        void loadSchedules();
        return;
      }
      const message: string = result.message ?? '';
      if (
        message.includes('未配置') ||
        message.toLowerCase().includes('not configured')
      ) {
        toast.error('多维表格未配置，请在插件管理中配置多维表格插件');
      } else {
        toast.error(message || '同步多维表格失败');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, '同步多维表格失败'));
    } finally {
      setRetryingId(null);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSchedule(deleteTarget.id);
      toast.success('排期已删除');
      setDeleteTarget(null);
      void loadSchedules();
    } catch (error) {
      const apiError: ApiErrorShape = error as ApiErrorShape;
      if (apiError.response?.status === 403) {
        toast.error('仅校长可以删除排期');
      } else {
        toast.error(
          getErrorMessage(error, '该排期仍有未清理的关联数据，无法删除'),
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarRange className="size-5 text-primary" />
            课程排期
          </h2>
          <p className="text-sm text-muted-foreground">
            开班安排、冲突检测与考勤管理
          </p>
        </div>
        <CanRole roles={SCHEDULE_WRITE_ROLES} fallback={null}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-ai-section-type="button"
              variant="outline"
              className="gap-1"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <Download className="size-4" />
              {exporting ? '导出中...' : '导出'}
            </Button>
            <Button
              data-ai-section-type="button"
              className="gap-1"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              新增排期
            </Button>
          </div>
        </CanRole>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">排期列表</TabsTrigger>
          <TabsTrigger value="leave">请假管理</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <ScheduleFilterBar
              courses={courses}
              filters={filters}
              onChange={handleFiltersChange}
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            {forbidden ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                暂无权限查看排期列表
              </p>
            ) : (
              <ScheduleTable
                items={items}
                total={total}
                page={page}
                pageSize={PAGE_SIZE}
                loading={loading}
                retryingId={retryingId}
                onPageChange={setPage}
                onViewAttendance={handleViewAttendance}
                onViewStudents={handleViewStudents}
                onBatchAttendance={handleBatchAttendance}
                onRetrySync={(item: ScheduleListItem) =>
                  void handleRetrySync(item)
                }
                onDelete={setDeleteTarget}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <LeavePanel />
        </TabsContent>
      </Tabs>

      <CreateScheduleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        courses={courses}
        onCreated={() => void loadSchedules()}
      />

      <AttendanceSheet
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        schedule={attendanceSchedule}
      />

      <EnrolledStudentsDialog
        open={studentsOpen}
        onOpenChange={setStudentsOpen}
        schedule={studentsSchedule}
      />

      <BatchRollCallDialog
        open={rollCallOpen}
        onOpenChange={setRollCallOpen}
        schedule={rollCallSchedule}
        onSaved={() => void loadSchedules()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除排期</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除排期「{deleteTarget?.scheduleName || '未命名排期'}」吗？删除后不可恢复；若该排期仍有报名学员或考勤记录，将无法删除。
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

export default SchedulesPage;
