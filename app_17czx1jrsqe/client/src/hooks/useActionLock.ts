import { useState, useCallback, useRef } from 'react';

/**
 * 防重复提交 Hook：确保同一操作在完成前不会再次执行
 * 使用 ref 做实际门控（避免闭包过期），state 驱动 UI loading 态
 */
export function useActionLock() {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  const withLock = useCallback(async (fn: () => Promise<void>) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    try {
      await fn();
    } finally {
      lockedRef.current = false;
      setLocked(false);
    }
  }, []);

  return { withLock, locked };
}