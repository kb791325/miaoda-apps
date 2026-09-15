// 任务编辑路由页: 复用任务表单页, 独立组件以满足路由唯一性检查
import TaskFormPage from './TaskFormPage';

export default function TaskEditPage() {
  return <TaskFormPage />;
}
