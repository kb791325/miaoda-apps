import { useParams } from 'react-router-dom';
import GenericFormPage from '@/components/generic/GenericFormPage';
import { MODULES } from '@/config/modules';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

/** 子表通用新建/编辑页: /sub/:subKey/new 与 /sub/:subKey/:id/edit (编辑态由 GenericFormPage 依据 :id 自判) */
export default function SubFormPage() {
  const { subKey = '' } = useParams<{ subKey: string }>();
  if (!MODULES[subKey]) return <NotFoundPage />;
  return <GenericFormPage moduleKey={subKey} />;
}
