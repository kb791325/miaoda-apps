// 客户编辑路由页: 复用客户表单页, 独立组件以满足路由唯一性检查
import CustomerFormPage from './CustomerFormPage';

export default function CustomerEditPage() {
  return <CustomerFormPage />;
}
