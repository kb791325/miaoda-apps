import type {
  BitableSyncResponse,
  BitableSyncResult,
  BitableSyncStatus,
} from './bitable-sync';

export interface ScheduleListItem {
  id: string;
  scheduleName: string;
  courseName: string;
  classDate: string | null;
  startTime: string | null;
  endTime: string | null;
  lecturerName: string;
  classroom: string | null;
  enrollmentCapacity: number;
  registeredCount: number;
  remainingQuota: number;
  status: string | null;
  bitableRecordId: string | null;
  syncStatus: BitableSyncStatus;
}

export interface ScheduleListResponse {
  items: ScheduleListItem[];
  total: number;
}

export interface CreateScheduleRequest {
  scheduleName: string;
  courseId: string;
  lecturer: string;
  classroom: string;
  classDate: string;
  startTime: string;
  endTime: string;
  enrollmentCapacity: number;
  studentIds: string[];
}

export interface CreateScheduleResponse {
  id: string;
  remainingQuota: number;
  syncStatus?: BitableSyncStatus;
}

export interface AttendanceItem {
  studentId: string;
  studentName: string;
  attendanceStatus: string | null;
  remark: string | null;
}

export interface AttendanceStats {
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceListResponse {
  items: AttendanceItem[];
  stats: AttendanceStats;
  syncStatus?: BitableSyncStatus;
}

export interface SaveAttendanceRecord {
  studentId: string;
  attendanceStatus: string;
  remark?: string;
}

export interface SaveAttendanceRequest {
  records: SaveAttendanceRecord[];
}

export type ScheduleBitableSyncResponse = BitableSyncResult;

/** 排期删除响应：本地删除结果 + bitable 回写状态（失败不阻断本地删除） */
export interface DeleteScheduleResponse extends BitableSyncResponse {
  id: string;
}

/** 考勤状态统一中文枚举 */
export const ATTENDANCE_STATUSES: string[] = [
  '出勤',
  '迟到',
  '早退',
  '旷课',
  '请假',
];

/** 排期学员名单条目（含该排期的考勤状态） */
export interface EnrolledStudentItem {
  studentId: string;
  studentName: string;
  contactPhone: string;
  paymentStatus: string | null;
  studyProgress: string | null;
  attendanceStatus: string | null;
  attendanceRemark: string | null;
}

export interface EnrolledStudentsResponse {
  items: EnrolledStudentItem[];
}

/** 批量点名单条记录 */
export interface BatchAttendanceItem {
  studentId: string;
  status: string;
  remark?: string;
}

/** POST /api/attendance/batch 请求体 */
export interface BatchAttendanceRequest {
  scheduleId: string;
  items: BatchAttendanceItem[];
}

/** GET /api/attendance/schedule-summary/:scheduleId */
export interface ScheduleAttendanceSummary {
  expected: number;
  present: number;
  attendanceRate: number;
}

/** GET /api/attendance/student-summary/:studentId（契约固定） */
export interface StudentAttendanceSummary {
  total: number;
  present: number;
  late: number;
  earlyLeave: number;
  absent: number;
  leave: number;
  attendanceRate: number;
}
