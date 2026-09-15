import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import type {
  CreateGraduationRequest,
  CreateGraduationResponse,
  GraduationListParams,
  GraduationListResponse,
  IssueCertificateResponse,
  StudentAttendanceSummary,
  UpdateGraduationRequest,
  UpdateGraduationResponse,
} from '@shared/graduation';

export const fetchGraduationList = async (
  params: GraduationListParams,
): Promise<GraduationListResponse> => {
  try {
    await reconcileBitable(['graduation']);
    const response = await axiosForBackend.get<GraduationListResponse>(
      '/api/graduation',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取结业档案列表失败', error);
    throw error;
  }
};

export const createGraduation = async (
  payload: CreateGraduationRequest,
): Promise<CreateGraduationResponse> => {
  try {
    const response = await axiosForBackend.post<CreateGraduationResponse>(
      '/api/graduation',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('结业登记失败', error);
    throw error;
  }
};

export const updateGraduation = async (
  graduationId: string,
  payload: UpdateGraduationRequest,
): Promise<UpdateGraduationResponse> => {
  try {
    const response = await axiosForBackend.patch<UpdateGraduationResponse>(
      `/api/graduation/${graduationId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新结业档案失败', error);
    throw error;
  }
};

export const issueGraduationCertificate = async (
  graduationId: string,
): Promise<IssueCertificateResponse> => {
  try {
    const response = await axiosForBackend.patch<IssueCertificateResponse>(
      `/api/graduation/${graduationId}/issue`,
    );
    return response.data;
  } catch (error) {
    logger.error('证书发证失败', error);
    throw error;
  }
};

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string } };
}

export const fetchStudentAttendanceSummary = async (
  studentId: string,
): Promise<StudentAttendanceSummary | null> => {
  try {
    const response = await axiosForBackend.get<StudentAttendanceSummary>(
      `/api/attendance/student-summary/${studentId}`,
    );
    return response.data;
  } catch (error) {
    const apiError: ApiErrorShape = error as ApiErrorShape;
    if (apiError.response?.status === 404) {
      return null;
    }
    logger.error('获取考勤汇总失败', error);
    throw error;
  }
};
