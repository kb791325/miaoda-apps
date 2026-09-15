import { Navigate } from 'react-router-dom';
import {
  ROLE_SUBJECT,
  useAuth,
} from '@lark-apaas/client-toolkit/auth';
import { PAGE_ROLE_MAP } from '@shared/roles';
import { Skeleton } from '@client/src/components/ui/skeleton';

const HomeRedirect = () => {
  const { ability, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const firstAllowedPath =
    Object.entries(PAGE_ROLE_MAP)
      .filter(([path]) => path !== '/')
      .find(([, roles]) =>
        roles.some((role) => ability.can(role, ROLE_SUBJECT)),
      )?.[0] ?? '/consultation';

  return <Navigate to={firstAllowedPath} replace />;
};

export default HomeRedirect;
