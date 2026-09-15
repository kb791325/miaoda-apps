import React from 'react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { Pencil } from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Image } from '@client/src/components/ui/image';
import { APP_ROLES } from '@shared/roles';
import type { CourseDetail } from '@shared/course';
import { getCourseFallbackCover } from './course-cover';

const COURSE_INFO_EDIT_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];
import {
  formatTuition,
  getDifficultyBadgeClass,
  getStatusBadgeClass,
} from './course.api';

interface CourseInfoCardProps {
  detail: CourseDetail;
  onEdit?: () => void;
}

export const CourseInfoCard: React.FC<CourseInfoCardProps> = ({
  detail,
  onEdit,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-lg border border-border bg-card p-6 shadow-sm lg:grid-cols-[320px_1fr]">
      <div className="overflow-hidden rounded-lg bg-muted">
        {(detail.productImage ?? []).length > 0 ? (
          <Image
            src={(detail.productImage ?? [])[0]}
            alt={detail.courseName}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <Image
            src={getCourseFallbackCover(detail.id)}
            alt={detail.courseName}
            className="aspect-[4/3] w-full object-cover"
          />
        )}
      </div>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {detail.courseName}
            </h2>
          <div className="flex flex-wrap items-center gap-2">
            {detail.courseCategory ? (
              <Badge variant="outline" className="rounded-full">
                {detail.courseCategory}
              </Badge>
            ) : null}
            {detail.difficultyLevel ? (
              <Badge
                className={`rounded-full border-transparent ${getDifficultyBadgeClass(detail.difficultyLevel)}`}
              >
                {detail.difficultyLevel}
              </Badge>
            ) : null}
            <Badge
              className={`rounded-full border-transparent ${getStatusBadgeClass(detail.status)}`}
            >
              {detail.status ?? '未知状态'}
            </Badge>
            </div>
          </div>
          {onEdit ? (
            <CanRole roles={COURSE_INFO_EDIT_ROLES} fallback={null}>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="size-3.5" />
                编辑课程
              </Button>
            </CanRole>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-accent/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">学习时长</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {detail.studyDuration ?? '暂无'}
            </p>
          </div>
          <div className="rounded-lg bg-accent/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">学费</p>
            <p className="mt-0.5 text-base font-bold text-primary">
              {formatTuition(detail.tuitionFee)}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">课程介绍</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {detail.courseIntro || '暂无课程介绍'}
          </p>
        </div>
        {detail.productImage.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {detail.productImage.map((src: string, index: number) => (
              <Image
                key={`${index}-${src}`}
                src={src}
                alt={`${detail.courseName} 图片 ${index + 1}`}
                className="size-16 rounded-md border border-border object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
