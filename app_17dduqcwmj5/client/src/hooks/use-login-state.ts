import { useEffect, useState } from 'react';
import { authClient } from '@lark-apaas/client-toolkit/auth';

export type LoginStatus = 'loading' | 'logged' | 'anonymous';

const GET_USER_INFO_TIMEOUT_MS = 10000;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      reject(new Error('getUserInfo timeout'));
    }, timeoutMs);
    promise
      .then((value: T) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const useLoginState = (): LoginStatus => {
  const [status, setStatus] = useState<LoginStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    withTimeout(authClient.session.getUserInfo(), GET_USER_INFO_TIMEOUT_MS)
      .then((result) => {
        if (cancelled) return;
        const userId: number | undefined = result.data?.user_info?.user_id;
        setStatus(result.error || !userId ? 'anonymous' : 'logged');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
};
