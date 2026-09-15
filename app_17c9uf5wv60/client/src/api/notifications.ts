import { logger } from '@lark-apaas/client-toolkit/logger';
import axiosForBackend from './apiClient';
import type {
  NotificationListResponse,
  NotificationSettings,
  UpdateNotificationSettingsRequest,
} from '@shared/api.interface';

export interface GetNotificationsParams {
  page?: number;
  pageSize?: number;
  onlyUnread?: boolean;
}

export async function getNotifications(
  params: GetNotificationsParams = {},
): Promise<NotificationListResponse> {
  logger.info('[notifications] getNotifications', JSON.stringify(params));
  const res = await axiosForBackend.get<NotificationListResponse>(
    '/api/notifications',
    { params },
  );
  return res.data;
}

export async function getUnreadCount(): Promise<{ unreadCount: number }> {
  const res = await axiosForBackend.get<{ unreadCount: number }>(
    '/api/notifications/unread-count',
  );
  return res.data;
}

export async function markAsRead(id: string): Promise<{ success: boolean }> {
  logger.info('[notifications] markAsRead', id);
  const res = await axiosForBackend.post<{ success: boolean }>(
    `/api/notifications/${id}/read`,
  );
  return res.data;
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  logger.info('[notifications] markAllAsRead');
  const res = await axiosForBackend.post<{ success: boolean }>(
    '/api/notifications/read-all',
  );
  return res.data;
}

export async function getSettings(): Promise<NotificationSettings> {
  const res = await axiosForBackend.get<NotificationSettings>(
    '/api/notifications/settings',
  );
  return res.data;
}

export async function updateSettings(
  data: UpdateNotificationSettingsRequest,
): Promise<NotificationSettings> {
  logger.info('[notifications] updateSettings', JSON.stringify(data));
  const res = await axiosForBackend.patch<NotificationSettings>(
    '/api/notifications/settings',
    data,
  );
  return res.data;
}
