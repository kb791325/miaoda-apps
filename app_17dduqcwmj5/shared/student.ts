import type { BitableSyncResult, BitableSyncStatus } from './bitable-sync';
import type { StudentGraduationSummary } from './graduation';

export interface StudentListItem {
  id: string;
  studentName: string;
  contactPhone: string;
  sourceChannel: string | null;
  enrollmentDate: string | null;
  paymentStatus: string | null;
  paymentAmount: number;
  studyProgress: string | null;
  learningManager: string | null;
  bitableRecordId: string | null;
  syncStatus: BitableSyncStatus;
  graduation?: StudentGraduationSummary | null;
}

export interface StudentListResponse {
  items: StudentListItem[];
  total: number;
}

export interface StudentDetail {
  id: string;
  studentName: string;
  contactPhone: string;
  wechatId: string | null;
  sourceChannel: string | null;
  learningManager: string | null;
  enrollmentDate: string | null;
  paymentStatus: string | null;
  paymentAmount: number;
  studyProgress: string | null;
  graduationDate: string | null;
  remark: string | null;
  managerProfile: string | null;
}

export interface StudentCourseRef {
  id: string;
  courseName: string;
}

export interface StudentAttendanceItem {
  scheduleName: string | null;
  classDate: string | null;
  attendanceStatus: string | null;
  remark: string | null;
}

export interface StudentDetailResponse {
  student: StudentDetail;
  courses: StudentCourseRef[];
  attendanceRecords: StudentAttendanceItem[];
}

export interface CreateStudentRequest {
  studentName: string;
  contactPhone: string;
  wechatId?: string;
  sourceChannel: string;
  courseIds: string[];
  enrollmentDate: string;
  paymentStatus: string;
  paymentAmount?: number;
  managerProfile?: string;
}

export interface CreateStudentResponse {
  id: string;
  notified: boolean;
  syncStatus?: BitableSyncStatus;
}

export interface UpdateStudentRequest {
  studentName: string;
  contactPhone: string;
  wechatId?: string;
  sourceChannel: string;
  enrollmentDate: string;
  studyProgress?: string;
  graduationDate?: string;
  remark?: string;
}

export interface UpdateStudentResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

export interface UpdatePaymentRequest {
  paymentAmount: number;
  paymentStatus: string;
}

export interface UpdatePaymentResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

export type StudentBitableSyncResponse = BitableSyncResult;
