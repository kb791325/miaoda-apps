import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authApi } from '@client/src/api';
import {
  clearLoggedOutFlag,
  hasLoggedOutFlag,
  setLoggedOutFlag,
} from '@client/src/utils/auth-storage';
import { setUnauthorizedHandler } from '@client/src/utils/auth-events';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import type {
  AppUserWithRole,
  LoginResponse,
  SessionResponse,
} from '@shared/auth';

interface AuthState {
  user: AppUserWithRole | null;
  permissions: string[];
  ready: boolean;
  hasPerm: (code: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  feishuLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUserWithRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const hadSessionRef = useRef<boolean>(false);

  useEffect(() => {
    hadSessionRef.current = user !== null;
  }, [user]);

  useEffect(() => {
    const handleUnauthorized = (): void => {
      const hadSession: boolean = hadSessionRef.current;
      setUser(null);
      setPermissions([]);
      if (hadSession) {
        toast.error('登录已过期，请重新登录');
      }
    };
    setUnauthorizedHandler(handleUnauthorized);
    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    if (hasLoggedOutFlag()) {
      setReady(true);
      return;
    }
    let cancelled = false;
    authApi
      .fetchSession()
      .then((session: SessionResponse) => {
        if (cancelled) return;
        setUser(session.user);
        setPermissions(session.permissions);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status: number | undefined = (
          err as { response?: { status?: number } }
        )?.response?.status;
        if (status !== 401) {
          logger.error(
            `会话校验失败: ${(err as Error)?.message ?? String(err)}`,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((res: LoginResponse): void => {
    clearLoggedOutFlag();
    setUser(res.user);
    setPermissions(res.permissions);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res: LoginResponse = await authApi.login({ username, password });
      applySession(res);
    },
    [applySession],
  );

  const feishuLogin = useCallback(async (): Promise<void> => {
    const res: LoginResponse = await authApi.feishuLogin();
    applySession(res);
  }, [applySession]);

  const logout = useCallback(() => {
    setLoggedOutFlag();
    setUser(null);
    setPermissions([]);
    authApi.logout().catch(() => undefined);
  }, []);

  const hasPerm = useCallback(
    (code: string) => permissions.includes(code),
    [permissions],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      permissions,
      ready,
      hasPerm,
      login,
      feishuLogin,
      logout,
    }),
    [user, permissions, ready, hasPerm, login, feishuLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return ctx;
}
