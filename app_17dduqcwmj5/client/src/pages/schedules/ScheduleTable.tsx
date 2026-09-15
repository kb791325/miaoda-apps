import React from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { PaginationBar } from '@client/src/components/PaginationBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type { ScheduleListItem } from '@shared/schedule';
import { APP_ROLES } from '@shared/roles';
import { getStatusBadgeClass } from '../courses/course.api';

const WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

interface ScheduleTableProps {
  items: ScheduleListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  retryingId: string | null;
  onPageChange: (page: number) => void;
  onViewAttendance: (item: ScheduleListItem) => void;
  onViewStudents: (item: ScheduleListItem) => void;
  onBatchAttendance: (item: ScheduleListItem) => void;
  onRetrySync: (item: ScheduleListItem) => void;
  onDelete: (item: ScheduleListItem) => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  items,
  total,
  page,
  pageSize,
  loading,
  retryingId,
  onPageChange,
  onViewAttendance,
  onViewStudents,
  onBatchAttendance,
  onRetrySync,
  onDelete,
}) => {
  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>排期名称</TableHead>
              <TableHead>课程</TableHead>
              <TableHead>上课日期</TableHead>
              <TableHead>时间</TableHead>
              <TableHead>讲师</TableHead>
              <TableHead>教室</TableHead>
              <TableHead>报名进度</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>同步状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  暂无排期数据
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: ScheduleListItem) => {
                const isFull: boolean = item.remainingQuota === 0;
                const isNearlyFull: boolean =
                  !isFull &&
                  item.enrollmentCapacity > 0 &&
                  item.remainingQuota <= item.enrollmentCapacity * 0.2;
                return (
                  <TableRow
                    key={item.id}
                    className={
                      isFull ? 'bg-[hsl(5_75%_55%/0.06)]' : undefined
                    }
                  >
                    <TableCell className="font-medium text-foreground">
                      {item.scheduleName || '未命名排期'}
                    </TableCell>
                    <TableCell>{item.courseName || '-'}</TableCell>
                    <TableCell>{item.classDate ?? '-'}</TableCell>
                    <TableCell>
                      {item.startTime ?? '--:--'} ~ {item.endTime ?? '--:--'}
                    </TableCell>
                    <TableCell>{item.lecturerName || '-'}</TableCell>
                    <TableCell>{item.classroom || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">
                          {item.registeredCount}/{item.enrollmentCapacity}
                        </span>
                        {isFull ? (
                          <Badge className="rounded-full border-transparent bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]">
                            满员
                          </Badge>
                        ) : null}
                        {isNearlyFull ? (
                          <Badge className="rounded-full border-transparent bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]">
                            临满
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          剩余 {item.remainingQuota}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-full border-transparent ${getStatusBadgeClass(item.status)}`}
                      >
                        {item.status ?? '未知'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.syncStatus === 'synced' ? (
                          <Badge className="rounded-full border-transparent bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_30%)]">
                            已同步
                          </Badge>
                        ) : item.syncStatus === 'failed' ? (
                          <Badge className="rounded-full border-transparent bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]">
                            同步失败
                          </Badge>
                        ) : (
                          <Badge className="rounded-full border-transparent bg-muted text-muted-foreground">
                            未同步
                          </Badge>
                        )}
                        {item.syncStatus === 'failed' ? (
                          <CanRole roles={WRITE_ROLES} fallback={null}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs text-primary"
                              disabled={retryingId === item.id}
                              onClick={() => onRetrySync(item)}
                            >
                              <RefreshCw
                                className={
                                  retryingId === item.id
                                    ? 'size-3 animate-spin'
                                    : 'size-3'
                                }
                              />
                              {retryingId === item.id ? '同步中' : '重新同步'}
                            </Button>
                          </CanRole>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <CanRole roles={WRITE_ROLES} fallback={null}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary"
                            onClick={() => onViewAttendance(item)}
                          >
                            <ClipboardList className="size-4" />
                            查看考勤
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary"
                            onClick={() => onViewStudents(item)}
                          >
                            <Users className="size-4" />
                            学员名单
                          </Button>
                        </CanRole>
                        <CanRole
                          roles={[APP_ROLES.principal, APP_ROLES.teachingTeacher]}
                          fallback={null}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary"
                            onClick={() => onBatchAttendance(item)}
                          >
                            <ClipboardCheck className="size-4" />
                            批量点名
                          </Button>
                        </CanRole>
                        <CanRole
                          roles={[APP_ROLES.principal]}
                          fallback={null}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[hsl(5_75%_55%)] hover:bg-[hsl(5_75%_55%/0.08)] hover:text-[hsl(5_75%_40%)]"
                            title="删除排期"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </CanRole>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        unit="条排期"
        onChange={onPageChange}
      />
    </div>
  );
};
