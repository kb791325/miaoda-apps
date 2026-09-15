import { useParams } from 'react-router-dom';
import GenericListPage from '@/components/generic/GenericListPage';
import { MODULES } from '@/config/modules';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

/** 子表通用列表页: /sub/:subKey */
export default function SubListPage() {
  const { subKey = '' } = useParams<{ subKey: string }>();
  if (!MODULES[subKey]) return <NotFoundPage />;
  return <GenericListPage moduleKey={subKey} />;
}
