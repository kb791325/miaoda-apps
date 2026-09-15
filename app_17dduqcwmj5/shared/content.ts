import type {
  MarketingContentStatus,
  MarketingContentType,
} from './api.interface';
import type { BitableSyncResponse } from './bitable-sync';

export type { MarketingContentStatus, MarketingContentType };

/** 招生内容删除响应：本地删除结果 + bitable 回写状态（失败不阻断本地删除） */
export interface DeleteContentResponse extends BitableSyncResponse {
  id: string;
}

/** 素材删除响应：本地删除结果 + bitable 回写状态（失败不阻断本地删除） */
export interface DeleteMaterialResponse extends BitableSyncResponse {
  id: string;
}

export interface AttachmentItem {
  name: string;
  url: string;
}

export interface MarketingContentListItem {
  id: string;
  title: string;
  courseId: string | null;
  courseName: string | null;
  contentType: MarketingContentType;
  body: string;
  status: MarketingContentStatus;
  scheduleDate: string | null;
  rejectReason: string | null;
  publishPlatform: string | null;
  likeCount: number | null;
  conversionCount: number | null;
  posterImages: string[];
  attachments: AttachmentItem[];
  createdAt: string;
  syncStatus?: string;
}

export interface MarketingContentListResponse {
  items: MarketingContentListItem[];
  total: number;
}

export type MarketingContentDetail = MarketingContentListItem;

export interface CreateMarketingContentRequest {
  title: string;
  courseId: string | null;
  contentType: MarketingContentType;
  body: string;
  scheduleDate?: string;
  posterImages?: string[];
  attachments?: AttachmentItem[];
}

export interface UpdateMarketingContentMediaRequest {
  posterImages?: string[];
  attachments?: AttachmentItem[];
}

export interface AuditMarketingContentRequest {
  action: 'approve' | 'reject';
  rejectReason?: string;
}

export interface MarketingContentStatusResponse {
  status: MarketingContentStatus;
}

export interface MarketingContentEffectRequest {
  publishPlatform: string;
  likeCount: number;
  conversionCount: number;
}

export interface CalendarContentBrief {
  id: string;
  title: string;
  status: MarketingContentStatus;
  contentType: MarketingContentType;
}

export interface CalendarDayItem {
  date: string;
  contents: CalendarContentBrief[];
}

export interface MarketingContentCalendarResponse {
  items: CalendarDayItem[];
}

export interface MaterialListItem {
  id: string;
  title: string;
  materialType: string;
  relatedCourseId: string | null;
  coreContent: string;
  applicablePlatform: string[];
  tag: string[];
  status: string;
  syncStatus?: string;
}

export interface CreateMaterialRequest {
  materialTitle: string;
  materialType?: string;
  relatedCourseId?: string;
  coreContent?: string;
  applicablePlatform?: string[];
  tag?: string[];
  status?: string;
}

export interface UpdateMaterialRequest {
  materialTitle?: string;
  materialType?: string;
  relatedCourseId?: string;
  coreContent?: string;
  applicablePlatform?: string[];
  tag?: string[];
  status?: string;
}

export interface MaterialListResponse {
  items: MaterialListItem[];
  total: number;
}

export interface MaterialOptionsResponse {
  materialTypes: string[];
  platforms: string[];
  tags: string[];
  statuses: string[];
}
