import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { PaginationBar } from '@client/src/components/PaginationBar';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type { StudentListItem } from '@shared/student';
import { APP_ROLES } from '@shared/roles';
import {
  formatAmount,
  getPaymentBadgeClass,
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from './student.api';

interface StudentTableProps {
  items: StudentListItem[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick: (id: string) => void;
  syncingIds: string[];
  onResync: (studentId: string) => void;
  onDelete: (item: StudentListItem) => void;
}

const EMPTY_TEXT = '-';

export const StudentTable: React.FC<StudentTableProps> = ({
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
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>姓名</TableHead>
            <TableHead>电话</TableHead>
            <TableHead>来源渠道</TableHead>
            <TableHead>报名日期</TableHead>
            <TableHead>缴费状态</TableHead>
            <TableHead>缴费金额</TableHead>
            <TableHead>学习进度</TableHead>
            <TableHead>学管师</TableHead>
            <TableHead>同步状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map(
              (_item: unknown, index: number) => (
                <TableRow key={index}>
                  {Array.from({ length: 10 }).map(
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
                colSpan={10}
                className="h-32 text-center text-muted-foreground"
              >
                暂无学员数据
              </TableCell>
            </TableRow>
          ) : (
            items.map((item: StudentListItem) => {
              const isSyncing: boolean = syncingIds.includes(item.id);
              return (
              <TableRow
                key={item.id}
                className="cursor-pointer even:bg-muted/30"
                onClick={() => onRowClick(item.id)}
              >
                <TableCell className="font-medium">
                  {item.studentName || EMPTY_TEXT}
                </TableCell>
                <TableCell>{item.contactPhone || EMPTY_TEXT}</TableCell>
                <TableCell>{item.sourceChannel ?? EMPTY_TEXT}</TableCell>
                <TableCell>{item.enrollmentDate ?? EMPTY_TEXT}</TableCell>
                <TableCell>
                  {item.paymentStatus ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentBadgeClass(item.paymentStatus)}`}
                    >
                      {item.paymentStatus}
                    </span>
                  ) : (
                    EMPTY_TEXT
                  )}
                </TableCell>
                <TableCell>{formatAmount(item.paymentAmount)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{item.studyProgress ?? EMPTY_TEXT}</span>
                    {item.graduation?.graduationCertNo && (
                      <span
                        className="inline-flex items-center rounded-full bg-[hsl(140_60%_45%/0.12)] px-2 py-0.5 text-xs font-medium text-[hsl(140_60%_28%)]"
                        title={`结业日期：${item.graduation.graduationDate ?? EMPTY_TEXT}`}
                      >
                        {item.graduation.graduationCertNo}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{item.learningManager ?? EMPTY_TEXT}</TableCell>
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
                <TableCell>
                  <CanRole roles={[APP_ROLES.principal]} fallback={null}>
                    <Button
                      data-ai-section-type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-[hsl(5_75%_55%)] hover:bg-[hsl(5_75%_55%/0.08)] hover:text-[hsl(5_75%_40%)]"
                      title="删除学员"
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
      {!loading && total > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          unit="名学员"
          onChange={onPageChange}
          className="border-t px-4 py-3"
        />
      )}
    </Card>
  );
};
