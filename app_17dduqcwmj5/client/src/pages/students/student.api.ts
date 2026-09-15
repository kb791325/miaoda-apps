import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import { fetchAllPages } from '@client/src/utils/fetch-all';
import type {
  CreateStudentRequest,
  CreateStudentResponse,
  StudentBitableSyncResponse,
  StudentDetailResponse,
  StudentListResponse,
  UpdatePaymentRequest,
  UpdatePaymentResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@shared/student';

export {
  ALL_VALUE,
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from '@client/src/utils/badge';

export const PAYMENT_STATUS_OPTIONS: string[] = [
  '未缴费',
  '部分缴费',
  '已缴清',
];

export const SOURCE_CHANNEL_OPTIONS: string[] = [
  '抖音',
  '美团',
  '转介绍',
  '地推',
  '其他',
];

export const STUDY_PROGRESS_OPTIONS: string[] = [
  '未开课',
  '学习中',
  '已结业',
];

export interface StudentListParams {
  paymentStatus?: string;
  channel?: string;
  progress?: string;
  graduationStatus?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const GRADUATION_STATUS_OPTIONS: Array<{
  label: string;
  value: 'graduated' | 'not_graduated';
}> = [
  { label: '已结业', value: 'graduated' },
  { label: '未结业', value: 'not_graduated' },
];

export interface CourseOption {
  id: string;
  courseName: string;
}

interface CourseOptionResponse {
  items: CourseOption[];
  total: number;
}

export const isForbiddenError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate: { response?: { status?: number } } = error as {
    response?: { status?: number };
  };
  return candidate.response?.status === 403;
};

export const fetchStudentList = async (
  params: StudentListParams,
): Promise<StudentListResponse> => {
  try {
    await reconcileBitable(['student']);
    const response = await axiosForBackend.get<StudentListResponse>(
      '/api/students',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取学员列表失败', error);
    throw error;
  }
};

export const fetchStudentDetail = async (
  studentId: string,
): Promise<StudentDetailResponse> => {
  try {
    const response = await axiosForBackend.get<StudentDetailResponse>(
      `/api/students/${studentId}`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取学员详情失败', error);
    throw error;
  }
};

export const createStudent = async (
  payload: CreateStudentRequest,
): Promise<CreateStudentResponse> => {
  try {
    const response = await axiosForBackend.post<CreateStudentResponse>(
      '/api/students',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('学员报名登记失败', error);
    throw error;
  }
};

export const updateStudentPayment = async (
  studentId: string,
  payload: UpdatePaymentRequest,
): Promise<UpdatePaymentResponse> => {
  try {
    const response = await axiosForBackend.patch<UpdatePaymentResponse>(
      `/api/students/${studentId}/payment`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新缴费信息失败', error);
    throw error;
  }
};

export const updateStudent = async (
  studentId: string,
  payload: UpdateStudentRequest,
): Promise<UpdateStudentResponse> => {
  try {
    const response = await axiosForBackend.patch<UpdateStudentResponse>(
      `/api/students/${studentId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新学员信息失败', error);
    throw error;
  }
};

export const syncStudentBitable = async (
  studentId: string,
): Promise<StudentBitableSyncResponse> => {
  try {
    const response =
      await axiosForBackend.post<StudentBitableSyncResponse>(
        `/api/students/${studentId}/bitable-sync`,
      );
    return response.data;
  } catch (error) {
    logger.error('学员多维表格同步失败', error);
    throw error;
  }
};

export const deleteStudent = async (studentId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/students/${studentId}`);
  } catch (error) {
    logger.error('删除学员失败', error);
    throw error;
  }
};

export const fetchCourseOptions = async (): Promise<CourseOption[]> => {
  try {
    return await fetchAllPages<CourseOption>(
      async (
        page: number,
        pageSize: number,
      ): Promise<CourseOptionResponse> => {
        const response = await axiosForBackend.get<CourseOptionResponse>(
          '/api/courses',
          { params: { page, pageSize } },
        );
        return response.data;
      },
    );
  } catch (error) {
    logger.error('获取课程下拉失败', error);
    throw error;
  }
};

export const getPaymentBadgeClass = (status: string | null): string => {
  const value: string = status ?? '';
  if (value.includes('未缴')) {
    return 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]';
  }
  if (value.includes('部分')) {
    return 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]';
  }
  if (value.includes('缴清') || value.includes('已缴')) {
    return 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]';
  }
  return 'bg-accent text-accent-foreground';
};

export const formatAmount = (amount: number | null | undefined): string =>
  `¥${(amount ?? 0).toLocaleString('zh-CN')}`;
