import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { PaginationBar } from '@client/src/components/PaginationBar';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { formatDate } from '@client/src/utils/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type { LeadCourseRef, LeadListItem } from '@shared/lead';
import { APP_ROLES } from '@shared/roles';
import {
  getClueStatusBadgeClass,
  getIntentionBadgeClass,
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from './leads.api';

interface LeadTableProps {
  items: LeadListItem[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick: (id: string) => void;
  syncingIds: string[];
  onResync: (leadId: string) => void;
  onDelete: (item: LeadListItem) => void;
}

const EMPTY_TEXT = '-';
const COLUMN_COUNT: number = 10;

export const LeadTable: React.FC<LeadTableProps> = ({
  items,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  syncingIds,
  onResync,
  onDelete,
}) => {
  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>姓名</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>来源渠道</TableHead>
              <TableHead>意向课程</TableHead>
              <TableHead>意向度</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>线索状态</TableHead>
              <TableHead>同步状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map(
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
                  暂无线索数据
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: LeadListItem) => {
                const isSyncing: boolean = syncingIds.includes(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer even:bg-muted/30"
                    onClick={() => onRowClick(item.id)}
                  >
                    <TableCell className="font-medium">
                      {item.clueName || EMPTY_TEXT}
                    </TableCell>
                    <TableCell>{item.phoneNumber || EMPTY_TEXT}</TableCell>
                    <TableCell>{item.sourceChannel ?? EMPTY_TEXT}</TableCell>
                    <TableCell>
                      {(item.intendedCourses ?? []).length > 0
                        ? (item.intendedCourses ?? [])
                            .map((course: LeadCourseRef) => course.courseName)
                            .join('、')
                        : EMPTY_TEXT}
                    </TableCell>
                    <TableCell>
                      {item.intentionDegree ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getIntentionBadgeClass(item.intentionDegree)}`}
                        >
                          {item.intentionDegree}
                        </span>
                      ) : (
                        EMPTY_TEXT
                      )}
                    </TableCell>
                    <TableCell>
                      {item.personInCharge ? (
                        <UserDisplay value={[item.personInCharge]} size="small" />
                      ) : (
                        EMPTY_TEXT
                      )}
                    </TableCell>
                    <TableCell>
                      {item.clueStatus ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getClueStatusBadgeClass(item.clueStatus)}`}
                        >
                          {item.clueStatus}
                        </span>
                      ) : (
                        EMPTY_TEXT
                      )}
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
                            className="h-8 gap-1 px-2.5 text-xs text-primary"
                            disabled={isSyncing}
                            onClick={(
                              event: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              event.stopPropagation();
                              onResync(item.id);
                            }}
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
                            />
                            {isSyncing ? '同步中' : '重新同步'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell>
                      <CanRole
                        roles={[
                          APP_ROLES.principal,
                          APP_ROLES.recruitmentTeacher,
                        ]}
                        fallback={null}
                      >
                        <Button
                          data-ai-section-type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-[hsl(5_75%_55%)] hover:bg-[hsl(5_75%_55%/0.08)] hover:text-[hsl(5_75%_40%)]"
                          title="删除线索"
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>,
                          ) => {
                            event.stopPropagation();
                            onDelete(item);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CanRole>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && total > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          unit="条线索"
          onChange={onPageChange}
          className="border-t px-4 py-3"
        />
      )}
    </Card>
  );
};
