import React from 'react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { Clock, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Image } from '@client/src/components/ui/image';
import { APP_ROLES } from '@shared/roles';
import type { CourseListItem } from '@shared/course';
import { CourseSyncBadge } from './CourseSyncBadge';
import { getCourseFallbackCover } from './course-cover';

const COURSE_EDIT_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];
import {
  formatTuition,
  getDifficultyBadgeClass,
  getStatusBadgeClass,
} from './course.api';

interface CourseCardProps {
  item: CourseListItem;
  onClick: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  syncing?: boolean;
  onRetrySync?: (id: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  item,
  onClick,
  onEdit,
  onDelete,
  syncing = false,
  onRetrySync,
}) => {
  const images: string[] = item.productImage ?? [];
  const coverSrc: string =
    images.length > 0 ? images[0] : getCourseFallbackCover(item.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item.id)}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') onClick(item.id);
      }}
      className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-0 shadow-sm transition-all duration-150 ease-out hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <Image
          src={coverSrc}
          alt={item.courseName}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
        <div className="absolute top-2 right-2 flex gap-1.5">
          <Badge
            className={`rounded-full border-transparent ${getStatusBadgeClass(item.status)}`}
          >
            {item.status ?? '未知状态'}
          </Badge>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-bold text-foreground">
              {item.courseName}
            </h3>
            {onEdit || onDelete ? (
              <div className="flex shrink-0 items-center gap-0.5">
                {onEdit ? (
                  <CanRole roles={COURSE_EDIT_ROLES} fallback={null}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      aria-label="编辑课程"
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>,
                      ) => {
                        event.stopPropagation();
                        onEdit(item.id);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </CanRole>
                ) : null}
                {onDelete ? (
                  <CanRole roles={[APP_ROLES.principal]} fallback={null}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-[hsl(5_75%_55%)]"
                      aria-label="删除课程"
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>,
                      ) => {
                        event.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </CanRole>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {item.courseCategory ? (
              <Badge variant="outline" className="rounded-full">
                {item.courseCategory}
              </Badge>
            ) : null}
            {item.difficultyLevel ? (
              <Badge
                className={`rounded-full border-transparent ${getDifficultyBadgeClass(item.difficultyLevel)}`}
              >
                {item.difficultyLevel}
              </Badge>
            ) : null}
            <div
              onClick={(event: React.MouseEvent<HTMLDivElement>) =>
                event.stopPropagation()
              }
            >
              <CourseSyncBadge
                syncStatus={item.syncStatus}
                isSyncing={syncing}
                onRetry={() => onRetrySync?.(item.id)}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {item.studyDuration ?? '时长未定'}
          </span>
          <span className="flex items-center gap-1 text-base font-bold text-primary">
            <GraduationCap className="size-4" />
            {formatTuition(item.tuitionFee)}
          </span>
        </div>
      </div>
    </div>
  );
};
