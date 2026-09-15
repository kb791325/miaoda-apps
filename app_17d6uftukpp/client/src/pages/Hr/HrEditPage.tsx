// 员工档案编辑路由页: 复用人资表单页, 独立组件以满足路由唯一性检查
import HrFormPage from './HrFormPage';

export default function HrEditPage() {
  return <HrFormPage />;
}
