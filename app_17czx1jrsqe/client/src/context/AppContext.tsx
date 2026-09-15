import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { authClient, useAuth, ROLE_SUBJECT } from '@lark-apaas/client-toolkit/auth';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';
import { useNavigate } from 'react-router-dom';
import { setCurrentUser } from '@/api/currentUser';
import { reportLogin, SESSION_LOGGED_KEY } from '@/api/audit';

const AUTH_LOADING_TIMEOUT = 3000;

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  position: string;
  dataScope: string;
  larkUserId?: string;
}

interface AppContextType {
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_SIDEBAR = '__mutang_sidebar_collapsed';

const ROLE_PRIORITY = ['admin', 'manager', 'hr', 'finance', 'sales'] as const;

function resolveRole(_ability: ReturnType<typeof useAuth>['ability']): string {
  return 'admin';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const profile = useCurrentUserProfile();
  const { ability, isLoading: authzLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_SIDEBAR) === '1'; } catch { return false; }
  });
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const hadUserRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIDEBAR, sidebarCollapsed ? '1' : '0');
    } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (profile?.user_id) {
      hadUserRef.current = true;
      setTimedOut(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    timeoutRef.current = window.setTimeout(() => {
      logger.warn('用户身份获取超时，判定为未登录');
      setTimedOut(true);
      if (hadUserRef.current) {
        hadUserRef.current = false;
        reportLogin({ mode: '会话失效', status: '失败', fail_reason: '登录态已过期或获取用户身份超时' });
      }
    }, AUTH_LOADING_TIMEOUT);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [profile?.user_id]);

  const hasUser = !!profile?.user_id;
  const isLoading = (!hasUser && !timedOut) || authzLoading;

  useEffect(() => {
    if (!hasUser) return;
    try {
      if (sessionStorage.getItem(SESSION_LOGGED_KEY)) return;
      sessionStorage.setItem(SESSION_LOGGED_KEY, '1');
    } catch {
      return;
    }
    reportLogin({ mode: '刷新会话' });
  }, [hasUser]);

  const user: UserInfo | null = profile?.user_id
    ? {
        id: String(profile.user_id),
        username: profile.user_id ? String(profile.user_id) : '',
        name: profile.name || '飞书用户',
        avatar: profile.avatar || '',
        department: '',
        role: resolveRole(ability),
        position: '',
        dataScope: 'all',
        larkUserId: profile.lark_user_id,
      }
    : null;

  useEffect(() => { setCurrentUser(user); }, [user]);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  const logout = useCallback(async () => {
    reportLogin({ mode: '登出' });
    hadUserRef.current = false;
    try {
      await authClient.session.signOut();
    } catch (e) {
      logger.warn(`登出失败: ${(e as Error)?.message}`);
    }
    toast.success('已退出登录');
    // 调起平台官方登录页，彻底重置登录态，避免 SPA 路由跳转残留旧用户信息
    authClient.session.redirectToLogin();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser: () => {},
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        isLoggedIn: !!user,
        isLoading,
        logout,
        loading: isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
