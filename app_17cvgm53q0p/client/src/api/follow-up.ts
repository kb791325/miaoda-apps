import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateFollowUpRequest,
  CreateFollowUpResponse,
  FollowUpCurrentUserResponse,
  FollowUpListResponse,
} from '@shared/follow-up';

export async function fetchFollowUps(
  customerId?: string,
): Promise<FollowUpListResponse> {
  const res = await axiosForBackend.get<FollowUpListResponse>(
    '/api/follow-ups',
    { params: customerId ? { customerId } : {} },
  );
  return res.data;
}

export async function fetchFollowUpCurrentUser(): Promise<FollowUpCurrentUserResponse> {
  const res = await axiosForBackend.get<FollowUpCurrentUserResponse>(
    '/api/follow-ups/current-user',
  );
  return res.data;
}

export async function createFollowUp(
  data: CreateFollowUpRequest,
): Promise<CreateFollowUpResponse> {
  const res = await axiosForBackend.post<CreateFollowUpResponse>(
    '/api/follow-ups',
    data,
  );
  return res.data;
}
