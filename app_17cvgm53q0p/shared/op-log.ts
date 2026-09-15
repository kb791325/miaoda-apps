export interface OpLogItem {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  detail: string;
  beforeValue: string;
  afterValue: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface OpLogListResponse {
  items: OpLogItem[];
  total: number;
}
