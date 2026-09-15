import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { toast } from 'sonner';
import { Plus, Search, Settings2 } from 'lucide-react';
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
import { APP_ROLES } from '@shared/roles';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { Input } from '@client/src/components/ui/input';
import { PaginationBar } from '@client/src/components/PaginationBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type {
  CourseCategory,
  CourseDetail,
  CourseListItem,
  CourseListResponse,
} from '@shared/course';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import { CategoryManageDialog } from './CategoryManageDialog';
import { CourseCard } from './CourseCard';
import { CourseFormDialog } from './CourseFormDialog';
import {
  deleteCourse,
  fetchCourseCategories,
  fetchCourseDetail,
  fetchCourseList,
} from './course.api';

const ALL_VALUE = '__all__';
const PAGE_SIZE = 12;
const COURSE_WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: { message?: string; error?: { message?: string } };
  };
}

const CourseListPage: React.FC = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>(ALL_VALUE);
  const [difficulty, setDifficulty] = useState<string>(ALL_VALUE);
  const [status, setStatus] = useState<string>(ALL_VALUE);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<CourseListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    difficulties: string[];
    statuses: string[];
  }>({ categories: [], difficulties: [], statuses: [] });
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<CourseDetail | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [managedCategories, setManagedCategories] = useState<string[]>([]);
  const [categoryManageOpen, setCategoryManageOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseListItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    let cancelled: boolean = false;
    const collectOptions = async (): Promise<void> => {
      const categories: string[] = [];
      const difficulties: string[] = [];
      const statuses: string[] = [];
      const pageSize: number = 100;
      const maxPages: number = 5;
      for (let page: number = 1; page <= maxPages; page += 1) {
        const result: CourseListResponse = await fetchCourseList({
          page,
          pageSize,
        });
        result.items.forEach((item: CourseListItem) => {
          if (item.courseCategory && !categories.includes(item.courseCategory)) {
            categories.push(item.courseCategory);
          }
          if (item.difficultyLevel && !difficulties.includes(item.difficultyLevel)) {
            difficulties.push(item.difficultyLevel);
          }
          if (item.status && !statuses.includes(item.status)) {
            statuses.push(item.status);
          }
        });
        if (result.items.length < pageSize) {
          break;
        }
      }
      if (!cancelled) {
        setFilterOptions({ categories, difficulties, statuses });
      }
    };
    collectOptions().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled: boolean = false;
    fetchCourseCategories()
      .then((result) => {
        if (cancelled) return;
        setManagedCategories(
          result.items.map((item: CourseCategory) => item.name),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [category, difficulty, status, keyword]);

  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetchCourseList({
      category: category === ALL_VALUE ? undefined : category,
      difficulty: difficulty === ALL_VALUE ? undefined : difficulty,
      status: status === ALL_VALUE ? undefined : status,
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, difficulty, status, keyword, page, refreshKey]);

  const refreshCourses = useCallback(() => {
    setRefreshKey((key: number) => key + 1);
  }, []);
  const {
    syncingIds: syncingCourseIds,
    retry: retryCourseSync,
  } = useBitableRetry('course', refreshCourses);

  const totalPages: number = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categorySelectOptions: string[] = useMemo(() => {
    const merged: string[] = [...managedCategories];
    filterOptions.categories.forEach((option: string) => {
      if (!merged.includes(option)) merged.push(option);
    });
    return merged;
  }, [managedCategories, filterOptions]);

  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/courses/${id}`);
    },
    [navigate],
  );

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback(async (id: string) => {
    try {
      const detail: CourseDetail = await fetchCourseDetail(id);
      setEditing(detail);
      setFormOpen(true);
    } catch {
      toast.error('课程信息加载失败，请稍后重试');
    }
  }, []);

  const handleDeleteRequest = useCallback(
    (id: string) => {
      const target: CourseListItem | undefined = items.find(
        (item: CourseListItem) => item.id === id,
      );
      if (target) setDeleteTarget(target);
    },
    [items],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse(deleteTarget.id);
      toast.success('课程已删除');
      setDeleteTarget(null);
      setRefreshKey((prev: number) => prev + 1);
    } catch (error) {
      const apiError = error as ApiErrorShape;
      if (apiError.response?.status === 409) {
        toast.error(
          `${apiError.response.data?.error?.message ?? apiError.response.data?.message ?? '该课程仍有未清理的关联数据，无法删除'}（可进入课程详情页删除对应关联数据）`,
        );
      } else if (apiError.response?.status === 403) {
        toast.error('仅校长可以删除课程');
      } else {
        toast.error('删除失败，请稍后重试');
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const filterBar = useMemo(
    () => (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6 shadow-sm md:flex-row md:flex-wrap md:items-center">
        <div className="relative w-full md:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keywordInput}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setKeywordInput(event.target.value)
            }
            placeholder="搜索课程名称"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="课程类别" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部类别</SelectItem>
            {categorySelectOptions.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="难度等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部难度</SelectItem>
            {filterOptions.difficulties.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="课程状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部状态</SelectItem>
            {filterOptions.statuses.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    [category, difficulty, status, keywordInput, filterOptions, categorySelectOptions],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">课程管理</h1>
          <p className="text-sm text-muted-foreground">
            浏览全部课程，按类别、难度与状态筛选
          </p>
        </div>
        <CanRole roles={COURSE_WRITE_ROLES} fallback={null}>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCategoryManageOpen(true)}>
              <Settings2 className="size-4" />
              类别管理
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="size-4" />
              新增课程
            </Button>
          </div>
        </CanRole>
      </div>
      {filterBar}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_: unknown, index: number) => (
            <div key={index} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
              <Skeleton className="aspect-[16/10] w-full rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty className="border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>暂无符合条件的课程</EmptyTitle>
            <EmptyDescription>
              请调整筛选条件或清空搜索关键词后重试
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div
            data-ai-section-type="card-list"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {items.map((item: CourseListItem) => (
              <CourseCard
                key={item.id}
                item={item}
                onClick={handleCardClick}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                syncing={syncingCourseIds.includes(item.id)}
                onRetrySync={retryCourseSync}
              />
            ))}
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            unit="门课程"
            onChange={setPage}
            className="py-2"
          />
        </>
      )}
      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSuccess={() => setRefreshKey((prev: number) => prev + 1)}
      />
      <CategoryManageDialog
        open={categoryManageOpen}
        onOpenChange={setCategoryManageOpen}
        onChanged={() => setRefreshKey((prev: number) => prev + 1)}
      />
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除课程</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除课程「{deleteTarget?.courseName}」吗？删除后多维表格课程总表中的对应课程也会同步删除，此操作不可恢复；若该课程仍有排期、报名学员等关联数据，将无法删除。
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

export default CourseListPage;
