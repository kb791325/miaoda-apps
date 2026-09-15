import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import type {
  CategoryListResponse,
  CourseCategory,
  CourseDetail,
  CourseFormPayload,
  CourseListItem,
  CourseListResponse,
  CourseScheduleBrief,
  CourseWriteResponse,
  CreateCategoryRequest,
  CreateEquipmentRequest,
  CreateFormulaRequest,
  CreateProcessFlowRequest,
  EquipmentItem,
  FormulaItem,
  ProcessFlowItem,
  UpdateCourseRequest,
  UpdateEquipmentRequest,
  UpdateFormulaRequest,
  UpdateProcessFlowRequest,
} from '@shared/course';

export interface CourseListParams {
  category?: string;
  difficulty?: string;
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ProtectedList<T> {
  forbidden: boolean;
  items: T[];
}

export const fetchCourseList = async (
  params: CourseListParams,
): Promise<CourseListResponse> => {
  try {
    await reconcileBitable(['course']);
    const response = await axiosForBackend.get<CourseListResponse>(
      '/api/courses',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取课程列表失败', error);
    throw error;
  }
};

export const fetchCourseDetail = async (
  courseId: string,
): Promise<CourseDetail> => {
  try {
    await reconcileBitable(['formula', 'processFlow', 'equipment']);
    const response = await axiosForBackend.get<CourseDetail>(
      `/api/courses/${courseId}`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取课程详情失败', error);
    throw error;
  }
};

export const createCourse = async (
  payload: CourseFormPayload,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.post<CourseWriteResponse>(
      '/api/courses',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('创建课程失败', error);
    throw error;
  }
};

export const updateCourse = async (
  courseId: string,
  payload: UpdateCourseRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.patch<CourseWriteResponse>(
      `/api/courses/${courseId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新课程失败', error);
    throw error;
  }
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/courses/${courseId}`);
  } catch (error) {
    logger.error('删除课程失败', error);
    throw error;
  }
};

export const fetchCourseCategories = async (): Promise<CategoryListResponse> => {
  try {
    const response = await axiosForBackend.get<CategoryListResponse>(
      '/api/courses/categories',
    );
    return response.data;
  } catch (error) {
    logger.error('获取课程类别失败', error);
    throw error;
  }
};

export const createCourseCategory = async (
  payload: CreateCategoryRequest,
): Promise<CourseCategory> => {
  try {
    const response = await axiosForBackend.post<CourseCategory>(
      '/api/courses/categories',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('创建课程类别失败', error);
    throw error;
  }
};

export const deleteCourseCategory = async (
  categoryId: string,
): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/courses/categories/${categoryId}`);
  } catch (error) {
    logger.error('删除课程类别失败', error);
    throw error;
  }
};

export const fetchFormulas = async (
  courseId: string,
  keyword?: string,
): Promise<ProtectedList<FormulaItem>> => {
  try {
    const response = await axiosForBackend.get<FormulaItem[]>(
      `/api/courses/${courseId}/formulas`,
      { params: keyword ? { keyword } : {} },
    );
    if (response.status === 403) {
      return { forbidden: true, items: [] };
    }
    return { forbidden: false, items: response.data };
  } catch (error) {
    logger.error('获取配方明细失败', error);
    throw error;
  }
};

export const fetchProcessFlows = async (
  courseId: string,
): Promise<ProtectedList<ProcessFlowItem>> => {
  try {
    const response = await axiosForBackend.get<ProcessFlowItem[]>(
      `/api/courses/${courseId}/process-flows`,
    );
    if (response.status === 403) {
      return { forbidden: true, items: [] };
    }
    return { forbidden: false, items: response.data };
  } catch (error) {
    logger.error('获取工艺流程失败', error);
    throw error;
  }
};

export const fetchEquipments = async (
  courseId: string,
): Promise<EquipmentItem[]> => {
  try {
    const response = await axiosForBackend.get<EquipmentItem[]>(
      `/api/courses/${courseId}/equipments`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取设备工具清单失败', error);
    throw error;
  }
};

export const fetchCourseSchedules = async (
  courseId: string,
): Promise<CourseScheduleBrief[]> => {
  try {
    const response = await axiosForBackend.get<CourseScheduleBrief[]>(
      `/api/courses/${courseId}/schedules`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取关联排期失败', error);
    throw error;
  }
};

export const createFormula = async (
  payload: CreateFormulaRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.post<CourseWriteResponse>(
      '/api/courses/formulas',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('新增配方明细失败', error);
    throw error;
  }
};

export const updateFormula = async (
  formulaId: string,
  payload: UpdateFormulaRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.patch<CourseWriteResponse>(
      `/api/courses/formulas/${formulaId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新配方明细失败', error);
    throw error;
  }
};

export const deleteFormula = async (formulaId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/courses/formulas/${formulaId}`);
  } catch (error) {
    logger.error('删除配方明细失败', error);
    throw error;
  }
};

export const createProcessFlow = async (
  payload: CreateProcessFlowRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.post<CourseWriteResponse>(
      '/api/courses/process-flows',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('新增工艺流程失败', error);
    throw error;
  }
};

export const updateProcessFlow = async (
  flowId: string,
  payload: UpdateProcessFlowRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.patch<CourseWriteResponse>(
      `/api/courses/process-flows/${flowId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新工艺流程失败', error);
    throw error;
  }
};

export const deleteProcessFlow = async (flowId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/courses/process-flows/${flowId}`);
  } catch (error) {
    logger.error('删除工艺流程失败', error);
    throw error;
  }
};

export const createEquipment = async (
  payload: CreateEquipmentRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.post<CourseWriteResponse>(
      '/api/courses/equipments',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('新增设备工具失败', error);
    throw error;
  }
};

export const updateEquipment = async (
  equipmentId: string,
  payload: UpdateEquipmentRequest,
): Promise<CourseWriteResponse> => {
  try {
    const response = await axiosForBackend.patch<CourseWriteResponse>(
      `/api/courses/equipments/${equipmentId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新设备工具失败', error);
    throw error;
  }
};

export const deleteEquipment = async (equipmentId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/courses/equipments/${equipmentId}`);
  } catch (error) {
    logger.error('删除设备工具失败', error);
    throw error;
  }
};

export const formatTuition = (tuition: number | null): string => {
  if (tuition === null || Number.isNaN(tuition)) return '面议';
  return `¥${tuition.toLocaleString('zh-CN')}`;
};

export const getStatusBadgeClass = (status: string | null): string => {
  const value: string = status ?? '';
  if (
    value.includes('启用') ||
    value.includes('上架') ||
    value.includes('招生') ||
    value.includes('正常') ||
    value.includes('开课') ||
    value.includes('进行中')
  ) {
    return 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]';
  }
  if (value.includes('满')) {
    return 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]';
  }
  if (
    value.includes('停') ||
    value.includes('下架') ||
    value.includes('结束') ||
    value.includes('关闭')
  ) {
    return 'bg-muted text-muted-foreground';
  }
  return 'bg-accent text-accent-foreground';
};

export const getDifficultyBadgeClass = (
  difficulty: string | null,
): string => {
  const value: string = difficulty ?? '';
  if (value.includes('入门') || value.includes('基础') || value.includes('初级')) {
    return 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]';
  }
  if (value.includes('进阶') || value.includes('中级')) {
    return 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]';
  }
  if (value.includes('高级') || value.includes('精通')) {
    return 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]';
  }
  return 'bg-accent text-accent-foreground';
};
