export interface IBaseRecord {
  recordId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICustomer extends IBaseRecord {
  name: string;
  shortName?: string;
  entityName?: string;
  status: string;
  level: 'A' | 'B' | 'C';
  industry?: string;
  tags?: string;
  source?: string;
  department?: string;
  signDate?: string;
  website?: string;
  intro?: string;
  note?: string;
}

export interface IAdProject extends IBaseRecord {
  code: string;
  customerId?: string;
  adType: string;
  channel?: string;
  budget: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  status: 'pending' | 'running' | 'closed';
}

export interface IVideoProject extends IBaseRecord {
  code: string;
  customerId?: string;
  videoType: string;
  director?: string;
  productionCycle?: string;
  budget: number;
  status: string;
}

export interface IContract extends IBaseRecord {
  code: string;
  customerId?: string;
  amount: number;
  signDate?: string;
  expireDate?: string;
  status: 'draft' | 'reviewing' | 'active' | 'expired';
}

export interface IFinanceRecord extends IBaseRecord {
  code: string;
  type: 'income' | 'expense';
  contractId?: string;
  amount: number;
  date?: string;
  handler?: string;
  note?: string;
}

export interface IEmployee extends IBaseRecord {
  name: string;
  department?: string;
  position?: string;
  hireDate?: string;
  status: 'active' | 'resigned';
  phone?: string;
}

export interface IAdminAsset extends IBaseRecord {
  name: string;
  category?: string;
  owner?: string;
  date?: string;
  status: string;
}

export interface ITask extends IBaseRecord {
  title: string;
  assignee?: string;
  priority: 'high' | 'mid' | 'low';
  dueDate?: string;
  relatedModule?: string;
  status: 'todo' | 'doing' | 'done';
}

export interface ISystemUser extends IBaseRecord {
  name: string;
  role: 'admin' | 'member';
  department?: string;
  accountStatus: 'enabled' | 'disabled';
}

export interface ISupportTicket extends IBaseRecord {
  code: string;
  submitter?: string;
  issueType?: string;
  description?: string;
  handler?: string;
  status: 'open' | 'processing' | 'resolved';
}

export interface IApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface IApiListResponse<T> {
  code: number;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
  message?: string;
}