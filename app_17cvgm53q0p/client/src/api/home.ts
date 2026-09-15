import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export interface HomeTodoItem {
  label: string;
  count: number;
  path: string;
}

/** 获取工作台待办事项（按角色），未知角色返回 { items: [] } */
export async function fetchHomeTodos(
  role: string,
): Promise<{ items: HomeTodoItem[] }> {
  const response = await axiosForBackend.get<{ items: HomeTodoItem[] }>(
    '/api/home/todos',
    { params: { role } },
  );
  return response.data;
}
