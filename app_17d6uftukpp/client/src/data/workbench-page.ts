// EXPORTS: IQuickEntry, QUICK_ENTRIES

export interface IQuickEntry {
  id: string
  label: string
  description: string
  route: string
}

export const QUICK_ENTRIES: IQuickEntry[] = [
  {
    id: '1',
    label: '新建客户',
    description: '录入新客户档案',
    route: '/customers/new',
  },
  {
    id: '2',
    label: '新建合同',
    description: '登记合同信息',
    route: '/contracts/new',
  },
  {
    id: '3',
    label: '新建任务',
    description: '创建待办任务',
    route: '/tasks/new',
  },
]