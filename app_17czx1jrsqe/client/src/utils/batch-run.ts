import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error-utils';

export interface BatchRunResult {
  successCount: number;
  failCount: number;
  failMessages: string[];
}

/**
 * 逐条执行批量操作，聚合成功/失败数量，单条失败不中断整体
 */
export async function runBatch(
  ids: string[],
  task: (id: string) => Promise<{ code: number; message?: string }>,
): Promise<BatchRunResult> {
  const result: BatchRunResult = { successCount: 0, failCount: 0, failMessages: [] };
  for (const id of ids) {
    try {
      const res = await task(id);
      if (res.code === 0) {
        result.successCount += 1;
      } else {
        result.failCount += 1;
        result.failMessages.push(res.message || `记录 ${id} 操作失败`);
      }
    } catch (e) {
      result.failCount += 1;
      result.failMessages.push(extractErrorMessage(e));
    }
  }
  return result;
}

export function reportBatchResult(label: string, result: BatchRunResult): void {
  if (result.failCount === 0) {
    toast.success(`${label}完成：成功 ${result.successCount} 条`);
    return;
  }
  toast.warning(`${label}完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`);
  result.failMessages.slice(0, 3).forEach((m) => toast.error(m));
  if (result.failMessages.length > 3) toast.error(`其余 ${result.failCount - 3} 条失败原因未展示`);
}
