interface ApiErrorBody {
  error?: { message?: string };
  message?: string;
}

interface AxiosLikeError {
  response?: { data?: ApiErrorBody };
  message?: string;
}

/** 提取后端错误信息：优先 error.response.data.error.message，兜底 error.message */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosLikeError;
    const serverMessage = axiosError.response?.data?.error?.message;
    if (serverMessage) return serverMessage;
    if (axiosError.message) return axiosError.message;
  }
  return '操作失败，请稍后重试';
}

/** 金额展示：¥xx.xx */
export function formatPrice(price: number): string {
  return `¥${Number(price ?? 0).toFixed(2)}`;
}

/** 金额展示（千分位 + 2 位小数）：¥1,234.56 */
export function formatMoney(amount: number): string {
  return `¥${Number(amount ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
