import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AttendanceOverviewResponse,
  CoursePopularityResponse,
  LeadConversionResponse,
  RevenueResponse,
} from '@shared/report';

async function requestReportData<T>(
  url: string,
  sceneName: string,
  params?: Record<string, string>,
): Promise<T> {
  try {
    const response = await axiosForBackend.get<T>(url, { params });
    return response.data;
  } catch (error) {
    logger.error(`报表接口请求失败(${sceneName}): ${url}`, error);
    throw error;
  }
}

export function fetchLeadConversion(): Promise<LeadConversionResponse> {
  return requestReportData<LeadConversionResponse>(
    '/api/report/lead-conversion',
    '线索转化分析',
  );
}

export function fetchRevenue(
  monthStart?: string,
  monthEnd?: string,
): Promise<RevenueResponse> {
  const params: Record<string, string> = {};
  if (monthStart && monthEnd) {
    params.monthStart = monthStart;
    params.monthEnd = monthEnd;
  }
  return requestReportData<RevenueResponse>(
    '/api/report/revenue',
    '收入分析',
    params,
  );
}

export function fetchCoursePopularity(): Promise<CoursePopularityResponse> {
  return requestReportData<CoursePopularityResponse>(
    '/api/report/course-popularity',
    '课程热度',
  );
}

export function fetchAttendanceOverview(): Promise<AttendanceOverviewResponse> {
  return requestReportData<AttendanceOverviewResponse>(
    '/api/report/attendance-overview',
    '考勤总览',
  );
}
