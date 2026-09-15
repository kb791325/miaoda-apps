import { useParams } from 'react-router-dom';
import GenericDetailPage from '@/components/generic/GenericDetailPage';
import { MODULES } from '@/config/modules';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

/** 子表通用详情页: /sub/:subKey/:id */
export default function SubDetailPage() {
  const { subKey = '' } = useParams<{ subKey: string }>();
  if (!MODULES[subKey]) return <NotFoundPage />;
  return <GenericDetailPage moduleKey={subKey} />;
}
