import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type {
  EnrolledStudentItem,
  EnrolledStudentsResponse,
  ScheduleListItem,
} from '@shared/schedule';
import { getAttendanceBadgeClass } from './attendanceStatus';
import { getPaymentBadgeClass } from '../students/student.api';
import { fetchEnrolledStudents } from './schedule.api';

interface EnrolledStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleListItem | null;
}

export const EnrolledStudentsDialog: React.FC<EnrolledStudentsDialogProps> = ({
  open,
  onOpenChange,
  schedule,
}) => {
  const [items, setItems] = useState<EnrolledStudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !schedule) {
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    setItems([]);
    fetchEnrolledStudents(schedule.id)
      .then((result: EnrolledStudentsResponse) => {
        if (!cancelled) {
          setItems(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('加载学员名单失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, schedule]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>学员名单</DialogTitle>
          <DialogDescription>
            {schedule?.scheduleName || '未命名排期'} ·{' '}
            {schedule?.classDate ?? '日期待定'} {schedule?.startTime ?? '--:--'}{' '}
            ~ {schedule?.endTime ?? '--:--'} · 共 {items.length} 名学员
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>学员姓名</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>缴费状态</TableHead>
                <TableHead>学习进度</TableHead>
                <TableHead>考勤状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    加载中...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    该排期暂无报名学员
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: EnrolledStudentItem) => (
                  <TableRow key={item.studentId || item.studentName}>
                    <TableCell className="font-medium text-foreground">
                      {item.studentName || '未知学员'}
                    </TableCell>
                    <TableCell>{item.contactPhone || '-'}</TableCell>
                    <TableCell>
                      {item.paymentStatus ? (
                        <Badge
                          className={`rounded-full border-transparent ${getPaymentBadgeClass(item.paymentStatus)}`}
                        >
                          {item.paymentStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{item.studyProgress || '-'}</TableCell>
                    <TableCell>
                      {item.attendanceStatus ? (
                        <Badge
                          className={`rounded-full border-transparent ${getAttendanceBadgeClass(item.attendanceStatus)}`}
                        >
                          {item.attendanceStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">未点名</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
