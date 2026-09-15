import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AttachmentItem,
  AttachmentStats,
  AttachmentListParams,
  AttachmentListResponse,
  CreateAttachmentDto,
  UpdateAttachmentDto,
} from '@shared/api.interface';

export async function createAttachment(
  body: CreateAttachmentDto,
): Promise<AttachmentItem> {
  const response = await axiosForBackend({
    url: '/api/attachments',
    method: 'POST',
    data: body,
  });
  return response.data;
}

export async function getAttachments(
  params: AttachmentListParams,
): Promise<AttachmentListResponse> {
  const response = await axiosForBackend({
    url: '/api/attachments',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getAttachmentsByRelated(
  relatedType: string,
  relatedId: string,
  page?: number,
  pageSize?: number,
): Promise<AttachmentListResponse> {
  const response = await axiosForBackend({
    url: '/api/attachments/by-related',
    method: 'GET',
    params: {
      relatedType,
      relatedId,
      page: page ?? 1,
      pageSize: pageSize ?? 20,
    },
  });
  return response.data;
}

export async function getAttachmentStats(): Promise<AttachmentStats> {
  const response = await axiosForBackend({
    url: '/api/attachments/stats',
    method: 'GET',
  });
  return response.data;
}

export async function getAttachment(id: string): Promise<AttachmentItem> {
  const response = await axiosForBackend({
    url: `/api/attachments/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function updateAttachment(
  id: string,
  body: UpdateAttachmentDto,
): Promise<AttachmentItem> {
  const response = await axiosForBackend({
    url: `/api/attachments/${id}`,
    method: 'PUT',
    data: body,
  });
  return response.data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/attachments/${id}`,
    method: 'DELETE',
  });
}

export async function batchDeleteAttachments(
  ids: string[],
): Promise<{ successCount: number; failedCount: number }> {
  const response = await axiosForBackend({
    url: '/api/attachments',
    method: 'DELETE',
    data: { ids },
  });
  return response.data;
}