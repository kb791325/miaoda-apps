// 系统用户编辑路由页: 复用系统管理表单页, 独立组件以满足路由唯一性检查
import SystemFormPage from './SystemFormPage';

export default function SystemEditPage() {
  return <SystemFormPage />;
}
