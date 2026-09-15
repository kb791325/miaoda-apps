import type { BitableSyncStatus } from './bitable-sync';

export const CERT_ISSUANCE_NOT_ISSUED = '未发证';
export const CERT_ISSUANCE_ISSUED = '已发证';

export interface GraduationCourseRef {
  id: string;
  courseName: string;
}

export interface GraduationRecordItem {
  id: string;
  graduationCertNo: string | null;
  studentId: string | null;
  studentName: string;
  courses: GraduationCourseRef[];
  trainingStartDate: string | null;
  trainingEndDate: string | null;
  totalClassHours: number;
  attendanceHours: number;
  /** 出勤率，0~100 百分数（如 100 表示 100%），服务端已归一化 */
  attendanceRate: number;
  practicalEvaluation: string | null;
  theoreticalEvaluation: string | null;
  graduationDate: string | null;
  certificateIssuanceStatus: string;
  syncStatus: BitableSyncStatus;
}

export interface GraduationListParams {
  page?: number;
  pageSize?: number;
  studentId?: string;
  keyword?: string;
}

export interface GraduationListResponse {
  items: GraduationRecordItem[];
  total: number;
}

export interface CreateGraduationRequest {
  studentId: string;
  courseIds: string[];
  trainingStartDate: string;
  trainingEndDate: string;
  totalClassHours: number;
  attendanceHours: number;
  practicalEvaluation?: string;
  theoreticalEvaluation?: string;
  graduationDate?: string;
}

export interface CreateGraduationResponse {
  id: string;
  graduationCertNo: string;
  /** 出勤率，0~100 百分数 */
  attendanceRate: number;
  syncStatus?: BitableSyncStatus;
}

export interface UpdateGraduationRequest {
  practicalEvaluation?: string;
  theoreticalEvaluation?: string;
}

export interface UpdateGraduationResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

export interface IssueCertificateResponse {
  id: string;
  graduationDate: string | null;
  syncStatus?: BitableSyncStatus;
}

export interface StudentGraduationSummary {
  graduationCertNo: string | null;
  graduationDate: string | null;
}

// StudentAttendanceSummary 定义归并至 schedule，这里再导出以保留导出名兼容既有引用
export type { StudentAttendanceSummary } from './schedule';
