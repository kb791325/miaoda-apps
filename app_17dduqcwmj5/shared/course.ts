export interface CourseListItem {
  id: string;
  courseName: string;
  courseCategory: string | null;
  difficultyLevel: string | null;
  studyDuration: string | null;
  tuitionFee: number | null;
  productImage: string[];
  status: string | null;
  syncStatus?: string;
}

export interface CourseListResponse {
  items: CourseListItem[];
  total: number;
}

export interface CourseDetail extends CourseListItem {
  courseIntro: string | null;
}

export interface CourseFormPayload {
  courseName: string;
  courseCategory?: string | null;
  difficultyLevel?: string | null;
  studyDuration?: string | null;
  tuitionFee?: number | null;
  status?: string | null;
  productImage?: string[];
  courseIntro?: string | null;
}

export interface CreateCourseRequest extends CourseFormPayload {}

export interface UpdateCourseRequest extends Partial<CourseFormPayload> {}

export interface CourseWriteResponse {
  id: string;
}

export interface CourseCategory {
  id: string;
  name: string;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface CategoryListResponse {
  items: CourseCategory[];
}

export const COURSE_DIFFICULTY_OPTIONS: string[] = [
  '零基础',
  '入门',
  '进阶',
  '高级',
];

export const COURSE_STATUS_OPTIONS: string[] = ['招生中', '暂停招生'];

export interface FormulaItem {
  id: string;
  ingredientName: string | null;
  quantity: number | null;
  unit: string | null;
  ingredientCategory: string | null;
  remark: string | null;
  syncStatus?: string;
}

export interface ProcessFlowItem {
  id: string;
  stepNo: number | null;
  stepName: string | null;
  operationDesc: string | null;
  keyControlPoint: string | null;
  estimatedDuration: string | null;
  operationVideo: string[];
  syncStatus?: string;
}

export interface EquipmentItem {
  id: string;
  equipmentToolName: string | null;
  specification: string | null;
  quantity: number | null;
  remark: string | null;
  syncStatus?: string;
}

export interface CreateEquipmentRequest {
  courseName: string;
  equipmentToolName: string;
  specification?: string;
  quantity?: number;
  remark?: string;
}

export interface UpdateEquipmentRequest {
  courseName?: string;
  equipmentToolName?: string;
  specification?: string;
  quantity?: number;
  remark?: string;
}

export interface CreateProcessFlowRequest {
  courseName: string;
  stepNo?: number;
  stepName: string;
  operationDesc?: string;
  keyControlPoint?: string;
  estimatedDuration?: string;
}

export interface UpdateProcessFlowRequest {
  courseName?: string;
  stepNo?: number;
  stepName?: string;
  operationDesc?: string;
  keyControlPoint?: string;
  estimatedDuration?: string;
}

export interface CreateFormulaRequest {
  courseName: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  ingredientCategory?: string;
  remark?: string;
}

export interface UpdateFormulaRequest {
  courseName?: string;
  ingredientName?: string;
  quantity?: number;
  unit?: string;
  ingredientCategory?: string;
  remark?: string;
}

export interface CourseScheduleBrief {
  id: string;
  scheduleName: string | null;
  classDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string | null;
}
