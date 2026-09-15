/**
 * 从各类错误对象中提取可读的错误消息
 * 兼容 axios 响应错误、嵌套 error.code/error.message、{code, msg} 等结构
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return '操作失败';
  if (typeof error === 'string') return error;

  const e = error as Record<string, any>;

  if (e.response?.data?.message) return String(e.response.data.message);
  if (e.response?.data?.msg) return String(e.response.data.msg);
  if (e.response?.data?.error?.message) return String(e.response.data.error.message);

  if (e.message) {
    if (typeof e.message === 'string' && e.message.includes('Network Error')) {
      return '网络异常，请重试';
    }
    return String(e.message);
  }
  if (e.msg) return String(e.msg);

  if (e.code === 'ERR_NETWORK') return '网络异常，请重试';

  return '操作失败';
}

/**
 * 校验记录主键是否有效，有效则返回 id 字符串，否则返回 null
 */
export function validateRecordId(record: Record<string, any> | null | undefined): string | null {
  if (!record) return null;
  const id = record.id ?? record._id;
  if (id === undefined || id === null || id === '' || String(id) === 'undefined') {
    return null;
  }
  return String(id);
}