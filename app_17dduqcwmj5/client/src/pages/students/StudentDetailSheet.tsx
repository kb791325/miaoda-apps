import React, { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Separator } from '@client/src/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@client/src/components/ui/sheet';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import type { StudentDetailResponse } from '@shared/student';
import {
  fetchStudentDetail,
  formatAmount,
  getPaymentBadgeClass,
} from './student.api';
import { PaymentDialog } from './PaymentDialog';
import { StudentAttendanceSummaryTab } from './StudentAttendanceSummaryTab';
import { StudentEditDialog } from './StudentEditDialog';
import { StudentGraduationTab } from './StudentGraduationTab';

interface StudentDetailSheetProps {
  studentId: string | null;
  onClose: () => void;
  onListChanged: () => void;
}

interface InfoItemProps {
  label: string;
  value?: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-medium">
      {value === undefined || value === null || value === '' ? '-' : value}
    </div>
  </div>
);

const EMPTY_TEXT = '-';

export const StudentDetailSheet: React.FC<StudentDetailSheetProps> = ({
  studentId,
  onClose,
  onListChanged,
}) => {
  const [detail, setDetail] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [paymentOpen, setPaymentOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const loadDetail = useCallback(
    (id: string) => {
      let cancelled: boolean = false;
      setLoading(true);
      fetchStudentDetail(id)
        .then((result: StudentDetailResponse) => {
          if (!cancelled) setDetail(result);
        })
        .catch(() => {
          if (!cancelled) setDetail(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [],
  );

  useEffect(() => {
    if (!studentId) {
      setDetail(null);
      return;
    }
    return loadDetail(studentId);
  }, [studentId, loadDetail]);

  const handleEditSaved = useCallback(() => {
    if (studentId) {
      loadDetail(studentId);
    }
    onListChanged();
  }, [studentId, loadDetail, onListChanged]);

  const handlePaymentSaved = useCallback(() => {
    if (studentId) {
      loadDetail(studentId);
    }
    onListChanged();
  }, [studentId, loadDetail, onListChanged]);

  return (
    <Sheet open={studentId !== null} onOpenChange={(open: boolean) => {
      if (!open) onClose();
    }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {loading || !detail ? (
          <div className="space-y-4 pt-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{detail.student.studentName || EMPTY_TEXT}</SheetTitle>
              <SheetDescription>
                学员档案、报名课程、缴费与考勤记录
              </SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="profile" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">学员档案</TabsTrigger>
                <TabsTrigger value="graduation">结业档案</TabsTrigger>
                <TabsTrigger value="attendance">考勤汇总</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="mt-4 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">基本信息</h3>
                  <Button
                    data-ai-section-type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    编辑
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem
                    label="联系电话"
                    value={detail.student.contactPhone}
                  />
                  <InfoItem label="微信号" value={detail.student.wechatId} />
                  <InfoItem
                    label="报名日期"
                    value={detail.student.enrollmentDate}
                  />
                  <InfoItem
                    label="学习进度"
                    value={detail.student.studyProgress}
                  />
                  <InfoItem
                    label="结业日期"
                    value={detail.student.graduationDate}
                  />
                  <InfoItem
                    label="学管师"
                    value={
                      detail.student.learningManager ?? undefined
                    }
                  />
                  <InfoItem
                    label="指定学管师"
                    value={
                      detail.student.managerProfile ? (
                        <UserDisplay
                          value={[detail.student.managerProfile]}
                          size="small"
                        />
                      ) : undefined
                    }
                  />
                </div>
              </section>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">报名课程</h3>
                {detail.courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    暂无报名课程记录
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.courses.map(
                      (course: { id: string; courseName: string }) => (
                        <Badge key={course.id} variant="secondary">
                          {course.courseName || EMPTY_TEXT}
                        </Badge>
                      ),
                    )}
                  </div>
                )}
              </section>
              <Separator />
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">缴费信息</h3>
                  <Button
                    size="sm"
                    onClick={() => setPaymentOpen(true)}
                  >
                    录入缴费
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem
                    label="缴费状态"
                    value={
                      detail.student.paymentStatus ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentBadgeClass(detail.student.paymentStatus)}`}
                        >
                          {detail.student.paymentStatus}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoItem
                    label="缴费金额"
                    value={formatAmount(detail.student.paymentAmount)}
                  />
                </div>
              </section>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">考勤记录</h3>
                {detail.attendanceRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    暂无考勤记录
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.attendanceRecords.map(
                      (
                        record: {
                          scheduleName: string | null;
                          classDate: string | null;
                          attendanceStatus: string | null;
                          remark: string | null;
                        },
                        index: number,
                      ) => (
                        <li
                          key={index}
                          className="rounded-lg border border-border bg-muted/30 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {record.scheduleName ?? EMPTY_TEXT}
                            </p>
                            <Badge variant="outline">
                              {record.attendanceStatus ?? EMPTY_TEXT}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {record.classDate ?? EMPTY_TEXT}
                            {record.remark ? ` · ${record.remark}` : ''}
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </section>
              {detail.student.remark && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">备注</h3>
                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {detail.student.remark}
                    </p>
                  </section>
                </>
              )}
              </TabsContent>
              {studentId && (
                <TabsContent value="graduation" className="mt-4">
                  <StudentGraduationTab
                    studentId={studentId}
                    onChanged={handleEditSaved}
                  />
                </TabsContent>
              )}
              {studentId && (
                <TabsContent value="attendance" className="mt-4">
                  <StudentAttendanceSummaryTab studentId={studentId} />
                </TabsContent>
              )}
            </Tabs>
            <StudentEditDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              student={detail.student}
              onSaved={handleEditSaved}
            />
            {studentId && (
              <PaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                studentId={studentId}
                defaultStatus={detail.student.paymentStatus ?? undefined}
                defaultAmount={detail.student.paymentAmount}
                onSaved={handlePaymentSaved}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
