interface ApiErrorShape {
  response?: { status?: number; data?: { message?: unknown } };
  message?: string;
}

export const extractErrorMessage = (
  error: unknown,
  fallback: string = '请求失败，请稍后重试',
): string => {
  const err: ApiErrorShape | null =
    error && typeof error === 'object' ? (error as ApiErrorShape) : null;
  if (err?.response?.status === 403) {
    return '暂无权限执行该操作';
  }
  const serverMessage: unknown = err?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.length > 0) {
    return serverMessage;
  }
  if (typeof err?.message === 'string' && err.message.length > 0) {
    return err.message;
  }
  return fallback;
};
