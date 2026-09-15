import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import type { StudentListItem } from '@shared/student';
import { LEAVE_TYPES } from '@shared/leave';
import type { CreateLeaveRequest, CreateLeaveResponse } from '@shared/leave';
import type { ScheduleListItem } from '@shared/schedule';
import {
  fetchScheduleList,
  fetchStudentOptions,
  getErrorMessage,
} from './schedule.api';
import { submitLeave } from './leave.api';

interface LeaveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

export const LeaveFormDialog: React.FC<LeaveFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmitted,
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [scheduleId, setScheduleId] = useState<string>('');
  const [leaveType, setLeaveType] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled: boolean = false;
    setLoadingOptions(true);
    Promise.all([
      fetchStudentOptions().catch(() => [] as StudentListItem[]),
      fetchScheduleList({ page: 1, pageSize: 100 }).catch(() => ({
        forbidden: false,
        items: [] as ScheduleListItem[],
        total: 0,
      })),
    ])
      .then(
        ([studentItems, scheduleResult]: [
          StudentListItem[],
          { items: ScheduleListItem[] },
        ]) => {
          if (!cancelled) {
            setStudents(studentItems);
            setSchedules(scheduleResult.items);
          }
        },
      )
      .finally(() => {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const resetForm = (): void => {
    setStudentId('');
    setScheduleId('');
    setLeaveType('');
    setLeaveReason('');
  };

  const handleSubmit = async (): Promise<void> => {
    if (studentId === '') {
      toast.error('请选择请假学员');
      return;
    }
    if (scheduleId === '') {
      toast.error('请选择关联排期');
      return;
    }
    if (leaveType === '') {
      toast.error('请选择请假类型');
      return;
    }
    if (leaveReason.trim().length === 0) {
      toast.error('请填写请假原因');
      return;
    }
    const payload: CreateLeaveRequest = {
      studentId,
      scheduleId,
      leaveType,
      leaveReason: leaveReason.trim(),
    };
    setSubmitting(true);
    try {
      const result: CreateLeaveResponse = await submitLeave(payload);
      toast.success('请假申请已提交，等待校长审批');
      if (result.syncStatus === 'failed') {
        toast.warning('请假已保存，但同步多维表格失败，可在失败行重试');
      }
      resetForm();
      onOpenChange(false);
      onSubmitted();
    } catch (error) {
      toast.error(getErrorMessage(error, '提交请假申请失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        onOpenChange(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>提交请假申请</DialogTitle>
          <DialogDescription>
            选择学员与排期，填写请假类型与原因
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              请假学员 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={studentId === '' ? undefined : studentId}
              onValueChange={(value: string) => setStudentId(value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingOptions ? '加载中...' : '请选择学员'}
                />
              </SelectTrigger>
              <SelectContent>
                {students.map((student: StudentListItem) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.studentName}
                    {student.contactPhone ? `（${student.contactPhone}）` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              关联排期 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={scheduleId === '' ? undefined : scheduleId}
              onValueChange={(value: string) => setScheduleId(value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingOptions ? '加载中...' : '请选择排期'}
                />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((item: ScheduleListItem) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.scheduleName || '未命名排期'} · {item.classDate ?? '日期待定'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              请假类型 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={leaveType === '' ? undefined : leaveType}
              onValueChange={(value: string) => setLeaveType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择请假类型" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              请假原因 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={3}
              placeholder="请简要说明请假原因"
              value={leaveReason}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setLeaveReason(event.target.value)
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? '提交中...' : '提交请假'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
