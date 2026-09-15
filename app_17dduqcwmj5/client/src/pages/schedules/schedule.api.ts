import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import { fetchAllPages } from '@client/src/utils/fetch-all';
import type {
  AttendanceListResponse,
  BatchAttendanceRequest,
  CreateScheduleRequest,
  CreateScheduleResponse,
  EnrolledStudentsResponse,
  SaveAttendanceRequest,
  ScheduleAttendanceSummary,
  ScheduleBitableSyncResponse,
  ScheduleListItem,
} from '@shared/schedule';
import type { StudentListItem, StudentListResponse } from '@shared/student';

export interface ScheduleListParams {
  courseId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ScheduleListResult {
  forbidden: boolean;
  items: ScheduleListItem[];
  total: number;
}

const getResponseStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate: Record<string, unknown> = error as Record<string, unknown>;
  const response: unknown = candidate.response;
  if (typeof response !== 'object' || response === null) {
    return undefined;
  }
  const status: unknown = (response as Record<string, unknown>).status;
  return typeof status === 'number' ? status : undefined;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }
  const response: unknown = (error as Record<string, unknown>).response;
  if (typeof response !== 'object' || response === null) {
    return fallback;
  }
  const data: unknown = (response as Record<string, unknown>).data;
  if (typeof data !== 'object' || data === null) {
    return fallback;
  }
  const message: unknown = (data as Record<string, unknown>).message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return fallback;
};

export const fetchScheduleList = async (
  params: ScheduleListParams,
): Promise<ScheduleListResult> => {
  try {
    await reconcileBitable(['schedule']);
    const response = await axiosForBackend.get<{
      items: ScheduleListItem[];
      total: number;
    }>('/api/schedules', { params });
    return {
      forbidden: false,
      items: response.data.items,
      total: response.data.total,
    };
  } catch (error) {
    if (getResponseStatus(error) === 403) {
      return { forbidden: true, items: [], total: 0 };
    }
    logger.error('获取排期列表失败', error);
    throw error;
  }
};

export const createSchedule = async (
  payload: CreateScheduleRequest,
): Promise<CreateScheduleResponse> => {
  try {
    const response = await axiosForBackend.post<CreateScheduleResponse>(
      '/api/schedules',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('新增排期失败', error);
    throw error;
  }
};

export const fetchAttendances = async (
  scheduleId: string,
): Promise<AttendanceListResponse> => {
  try {
    await reconcileBitable(['attendance']);
    const response = await axiosForBackend.get<AttendanceListResponse>(
      `/api/schedules/${scheduleId}/attendances`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取考勤记录失败', error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/schedules/${scheduleId}`);
  } catch (error) {
    logger.error('删除排期失败', error);
    throw error;
  }
};

export const saveAttendances = async (
  scheduleId: string,
  payload: SaveAttendanceRequest,
): Promise<AttendanceListResponse> => {
  try {
    const response = await axiosForBackend.put<AttendanceListResponse>(
      `/api/schedules/${scheduleId}/attendances`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('保存考勤记录失败', error);
    throw error;
  }
};

export const syncScheduleBitable = async (
  scheduleId: string,
): Promise<ScheduleBitableSyncResponse> => {
  try {
    const response = await axiosForBackend.post<ScheduleBitableSyncResponse>(
      `/api/schedules/${scheduleId}/bitable-sync`,
    );
    return response.data;
  } catch (error) {
    logger.error('同步排期到多维表格失败', error);
    throw error;
  }
};

export const fetchEnrolledStudents = async (
  scheduleId: string,
): Promise<EnrolledStudentsResponse> => {
  try {
    const response = await axiosForBackend.get<EnrolledStudentsResponse>(
      `/api/schedules/${scheduleId}/enrolled-students`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取学员名单失败', error);
    throw error;
  }
};

export const fetchRollCall = async (
  scheduleId: string,
): Promise<AttendanceListResponse> => {
  try {
    const response = await axiosForBackend.get<AttendanceListResponse>(
      `/api/schedules/${scheduleId}/roll-call`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取点名数据失败', error);
    throw error;
  }
};

export const batchSaveAttendance = async (
  payload: BatchAttendanceRequest,
): Promise<AttendanceListResponse> => {
  try {
    const response = await axiosForBackend.post<AttendanceListResponse>(
      '/api/attendance/batch',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('批量点名保存失败', error);
    throw error;
  }
};

export const fetchScheduleAttendanceSummary = async (
  scheduleId: string,
): Promise<ScheduleAttendanceSummary> => {
  try {
    const response = await axiosForBackend.get<ScheduleAttendanceSummary>(
      `/api/attendance/schedule-summary/${scheduleId}`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取排期考勤统计失败', error);
    throw error;
  }
};

export const fetchStudentOptions = async (): Promise<StudentListItem[]> => {
  try {
    return await fetchAllPages<StudentListItem>(
      async (
        page: number,
        pageSize: number,
      ): Promise<StudentListResponse> => {
        const response = await axiosForBackend.get<StudentListResponse>(
          '/api/students',
          { params: { page, pageSize } },
        );
        return response.data;
      },
    );
  } catch (error) {
    logger.error('获取学员列表失败', error);
    throw error;
  }
};

export const buildTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour: number = 7; hour <= 21; hour += 1) {
    const hh: string = String(hour).padStart(2, '0');
    options.push(`${hh}:00`, `${hh}:30`);
  }
  options.push('22:00');
  return options;
};
