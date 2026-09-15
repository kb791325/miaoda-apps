import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { UserSearchResponse, UserSearchItem } from '@shared/api.interface';

export async function searchUsers(
  keyword: string,
  pageSize = 20,
): Promise<UserSearchItem[]> {
  const response = await axiosForBackend.get<UserSearchResponse>(
    '/api/users/search',
    {
      params: { keyword, pageSize },
    },
  );
  return response.data.items;
}
