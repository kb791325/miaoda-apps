import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { APP_ROLES } from '@shared/roles';
import type { CourseDetail } from '@shared/course';
import { CourseFormDialog } from './CourseFormDialog';
import { CourseInfoCard } from './CourseInfoCard';
import { EquipmentSection } from './EquipmentSection';
import { FormulaSection } from './FormulaSection';
import { ProcessFlowSection } from './ProcessFlowSection';
import { ScheduleSection } from './ScheduleSection';
import { fetchCourseDetail } from './course.api';

const SECTION_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

const SectionSkeleton: React.FC = () => (
  <div className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-24 w-full" />
  </div>
);

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingOpen, setEditingOpen] = useState<boolean>(false);

  const reload = useCallback(() => {
    if (!id) return;
    fetchCourseDetail(id)
      .then((result: CourseDetail) => {
        setDetail(result);
        setError('');
      })
      .catch(() => {
        setError('课程不存在或加载失败，请返回课程列表重试');
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled: boolean = false;
    setLoading(true);
    setError('');
    fetchCourseDetail(id)
      .then((result: CourseDetail) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setError('课程不存在或加载失败，请返回课程列表重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/courses')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回课程列表
        </Button>
      </div>
      {loading ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="space-y-3">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      ) : error || !detail || !id ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {error || '课程不存在'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <CourseInfoCard detail={detail} onEdit={() => setEditingOpen(true)} />
          <CanRole roles={SECTION_ROLES} fallback={null}>
            <FormulaSection courseId={id} />
          </CanRole>
          <CanRole roles={SECTION_ROLES} fallback={null}>
            <ProcessFlowSection courseId={id} />
          </CanRole>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <CanRole roles={SECTION_ROLES} fallback={null}>
              <EquipmentSection courseId={id} />
            </CanRole>
            <ScheduleSection courseId={id} />
          </div>
        </div>
      )}
      <CourseFormDialog
        open={editingOpen}
        onOpenChange={setEditingOpen}
        initial={detail}
        onSuccess={reload}
      />
    </div>
  );
};

export default CourseDetailPage;
