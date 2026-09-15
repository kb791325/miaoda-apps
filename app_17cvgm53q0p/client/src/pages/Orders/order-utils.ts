import dayjs from 'dayjs';

import type { Order } from '@shared/order';

/** 订单筛选条件（空字符串表示不筛选） */
export interface OrdersFilters {
  keyword: string;
  status: string;
  customerId: string;
  dateStart: string;
  dateEnd: string;
}

export const EMPTY_ORDERS_FILTERS: OrdersFilters = {
  keyword: '',
  status: '',
  customerId: '',
  dateStart: '',
  dateEnd: '',
};

/** 状态标签 pill 配色（与发货状态共用同一套语义色） */
export { STATUS_TAG_CLASS as ORDER_STATUS_PILL_CLASS } from '@client/src/utils/status-tag-styles';

/** Order 接口未声明 address，但接口可能透传，读取侧统一用该类型 */
export type OrderWithAddress = Order & { address?: string };

/** 金额格式化：¥ + 千分位 */
export const formatAmount = (value: number): string =>
  `¥${value.toLocaleString('zh-CN')}`;

/** 时间格式化：YYYY-MM-DD HH:mm */
export const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
};

interface ApiErrorLike {
  response?: { data?: { error?: { message?: string } } };
  message?: string;
}

/** 从 axios 错误中提取展示信息，兜底 error.message */
export const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const apiError = error as ApiErrorLike;
    return (
      apiError.response?.data?.error?.message ??
      apiError.message ??
      '请求失败，请稍后重试'
    );
  }
  return '请求失败，请稍后重试';
};
