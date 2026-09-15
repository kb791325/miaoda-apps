import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationType,
  NotificationPriority,
} from '@shared/api.interface';

export interface GetNotificationListParams {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export async function getNotificationList(
  params: GetNotificationListParams,
): Promise<NotificationListResponse> {
  const response = await axiosForBackend({
    url: '/api/notifications',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await axiosForBackend({
    url: '/api/notifications/unread-count',
    method: 'GET',
  });
  return response.data;
}

export async function getNotificationDetail(id: string): Promise<Notification> {
  const response = await axiosForBackend({
    url: `/api/notifications/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function markAsRead(id: string): Promise<Notification> {
  const response = await axiosForBackend({
    url: `/api/notifications/${id}/read`,
    method: 'POST',
  });
  return response.data;
}

export async function markAllAsRead(): Promise<{ updated: number }> {
  const response = await axiosForBackend({
    url: '/api/notifications/read-all',
    method: 'POST',
  });
  return response.data;
}

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string;
  priority: NotificationPriority;
}): Promise<{ id: string }> {
  const response = await axiosForBackend({
    url: '/api/notifications',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function deleteNotification(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/notifications/${id}`,
    method: 'DELETE',
  });
}
