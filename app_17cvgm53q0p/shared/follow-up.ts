export const FOLLOW_UP_METHODS = [
  '电话',
  '微信',
  '到店',
  '上门',
  '其他',
] as const;
export type FollowUpMethod = (typeof FOLLOW_UP_METHODS)[number];

export const FOLLOW_UP_INTENTS = ['高', '中', '低', '无意向'] as const;
export type FollowUpIntent = (typeof FOLLOW_UP_INTENTS)[number];

export interface FollowUpRecord {
  id: string;
  followNo: string;
  customerId: string;
  customerName: string;
  followerId: string;
  /** 跟进人姓名（服务端关联应用账号返回，自建账号体系下前端优先展示） */
  followerName: string;
  followUpAt: string;
  method: string;
  content: string;
  intent: string;
  demandProduct: string;
  budget: number | null;
  nextFollowUpAt: string;
  stageChange: string;
}

export interface CreateFollowUpRequest {
  customerId: string;
  /** 跟进人 userId，缺省由服务端取当前登录用户 */
  followerId?: string;
  followUpAt?: string;
  method: string;
  content: string;
  intent?: string;
  demandProduct?: string;
  budget?: number | null;
  nextFollowUpAt?: string;
  stageChange?: string;
}

export interface CreateFollowUpResponse {
  id: string;
}

export interface FollowUpListResponse {
  items: FollowUpRecord[];
  total: number;
}

export interface FollowUpCurrentUserResponse {
  userId: string;
  name: string;
}
