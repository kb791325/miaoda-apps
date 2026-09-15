import type { BitableSyncStatus } from './bitable-sync';

/** 来源渠道枚举 */
export const LEAD_SOURCE_CHANNELS: string[] = [
  '抖音',
  '快手',
  '朋友圈',
  '老学员介绍',
  '到店咨询',
  '百度',
  '其他',
];

/** 意向度枚举 */
export const LEAD_INTENTION_DEGREES: string[] = ['高', '中', '低'];

/** 线索状态枚举 */
export const LEAD_CLUE_STATUSES: string[] = [
  '新线索',
  '跟进中',
  '已报名',
  '已流失',
];

/** 跟进方式枚举 */
export const LEAD_FOLLOW_UP_METHODS: string[] = [
  '电话',
  '微信',
  '到店',
  '其他',
];

export const LEAD_STATUS_NEW: string = '新线索';
export const LEAD_STATUS_FOLLOWING: string = '跟进中';
export const LEAD_STATUS_ENROLLED: string = '已报名';
export const LEAD_STATUS_LOST: string = '已流失';

export interface LeadCourseRef {
  id: string;
  courseName: string;
}

export interface LeadListItem {
  id: string;
  clueName: string;
  phoneNumber: string;
  sourceChannel: string | null;
  intendedCourses: LeadCourseRef[];
  intentionDegree: string | null;
  clueStatus: string | null;
  personInCharge: string | null;
  nextFollowTime: string | null;
  syncStatus: BitableSyncStatus;
  createdAt: string;
}

export interface LeadListResponse {
  items: LeadListItem[];
  total: number;
}

export interface CreateLeadRequest {
  clueName: string;
  phoneNumber: string;
  sourceChannel: string;
  intendedCourseIds?: string[];
  intentionDegree?: string;
  personInCharge?: string;
  firstConsultTime?: string;
  nextFollowTime?: string;
  remark?: string;
}

export interface CreateLeadResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

export interface UpdateLeadRequest {
  clueName?: string;
  phoneNumber?: string;
  sourceChannel?: string;
  intendedCourseIds?: string[];
  intentionDegree?: string | null;
  clueStatus?: string;
  personInCharge?: string | null;
  firstConsultTime?: string | null;
  nextFollowTime?: string | null;
  remark?: string | null;
}

export interface UpdateLeadResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

export interface DeleteLeadResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

export interface FollowUpRecordItem {
  id: string;
  followUpContent: string | null;
  followUpMethod: string | null;
  followUpTime: string | null;
  nextFollowUpPlan: string | null;
  follower: string | null;
}

export interface LeadDetail {
  id: string;
  clueName: string;
  phoneNumber: string;
  sourceChannel: string | null;
  intentionDegree: string | null;
  clueStatus: string | null;
  personInCharge: string | null;
  firstConsultTime: string | null;
  nextFollowTime: string | null;
  remark: string | null;
  syncStatus: BitableSyncStatus;
  createdAt: string;
}

export interface LeadDetailResponse {
  lead: LeadDetail;
  courses: LeadCourseRef[];
  followUps: FollowUpRecordItem[];
}

export interface CreateFollowUpRequest {
  followUpContent: string;
  followUpMethod: string;
  followUpTime?: string;
  nextFollowUpPlan?: string;
}

export interface CreateFollowUpResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
  leadSyncStatus?: BitableSyncStatus;
}

export interface ConvertLeadResponse {
  studentId: string;
  syncStatus?: BitableSyncStatus;
  leadSyncStatus?: BitableSyncStatus;
}

export interface LeadStatusCountItem {
  status: string;
  count: number;
}

export interface LeadChannelCountItem {
  channel: string;
  count: number;
}

export interface LeadIntentionCountItem {
  intentionDegree: string;
  count: number;
}

export interface LeadStatsResponse {
  total: number;
  statusCounts: LeadStatusCountItem[];
  channelCounts: LeadChannelCountItem[];
  intentionCounts: LeadIntentionCountItem[];
  /** 转化率，0~1 小数（如 0.1667），前端展示需 ×100 */
  conversionRate: number;
}

export interface LeadTodoItem {
  leadId: string;
  name: string;
  phone: string;
  nextFollowTime: string | null;
  overdue: boolean;
}

export interface LeadTodoResponse {
  items: LeadTodoItem[];
}
