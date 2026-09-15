import { useState, useEffect, useContext, createContext, useMemo } from 'react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface RoleContextValue {
  roles: string[];
  isLoading: boolean;
  hasRole: (role: string | string[]) => boolean;
}

const RoleContext = createContext<RoleContextValue>({
  roles: [],
  isLoading: true,
  hasRole: () => false,
});

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadRoles = async () => {
      try {
        const res = await axiosForBackend.post('/api/permissions/roles', {});
        const roleList = res?.data?.data?.roleList ?? [];
        if (!cancelled) {
          setRoles(Array.isArray(roleList) ? roleList : []);
        }
      } catch {
        if (!cancelled) {
          setRoles([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRole = (role: string | string[]) => {
    const required = Array.isArray(role) ? role : [role];
    return required.some((r) => roles.includes(r));
  };

  const value = useMemo(
    () => ({ roles, isLoading, hasRole }),
    [roles, isLoading],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRoles = () => useContext(RoleContext);
