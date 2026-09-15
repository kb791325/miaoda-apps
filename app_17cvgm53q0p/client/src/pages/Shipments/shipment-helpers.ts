import dayjs from 'dayjs';

export const formatTime = (value?: string): string =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';

export const extractErrorMessage = (error: unknown): string => {
  const err = error as {
    response?: {
      data?: { error?: { message?: string }; message?: string };
    };
  };
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    '请求失败，请稍后重试'
  );
};
