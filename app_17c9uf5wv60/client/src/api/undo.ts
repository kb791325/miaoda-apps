import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { UndoRequest, UndoResponse } from '@shared/api.interface';

export async function undoOperation(dto: UndoRequest): Promise<UndoResponse> {
  const res = await axiosForBackend.post<UndoResponse>('/api/undo', dto);
  return res.data;
}
