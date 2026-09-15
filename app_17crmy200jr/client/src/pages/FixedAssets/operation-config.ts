export type AssetOperationType =
  | 'borrow'
  | 'return'
  | 'repair_start'
  | 'repair_complete'
  | 'transfer_start'
  | 'transfer_complete'
  | 'scrap';

export const OPERATION_TITLE: Record<AssetOperationType, string> = {
  borrow: '资产领用',
  return: '资产归还',
  repair_start: '发起维修',
  repair_complete: '完成维修',
  transfer_start: '发起调拨',
  transfer_complete: '完成调拨',
  scrap: '资产报废',
};

type FieldKey =
  | 'targetUserId'
  | 'expectedReturnDate'
  | 'expectedDate'
  | 'reason'
  | 'remark'
  | 'cost'
  | 'actualCost'
  | 'vendor'
  | 'targetDepartment'
  | 'targetFloor';

export interface FieldCfg {
  key: FieldKey;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'user';
  required?: boolean;
  full?: boolean;
}

export const FIELD_CONFIGS: Record<AssetOperationType, FieldCfg[]> = {
  borrow: [
    { key: 'targetUserId', label: '领用人', type: 'user', required: true },
    { key: 'expectedReturnDate', label: '预计归还日期', type: 'date' },
    { key: 'reason', label: '领用原因', type: 'textarea', full: true },
    { key: 'remark', label: '备注', type: 'textarea', full: true },
  ],
  return: [{ key: 'remark', label: '备注', type: 'textarea', full: true }],
  repair_start: [
    { key: 'reason', label: '故障原因', type: 'textarea', required: true, full: true },
    { key: 'expectedDate', label: '预计完成日期', type: 'date' },
    { key: 'cost', label: '预估费用', type: 'number' },
    { key: 'vendor', label: '维修商', type: 'text', full: true },
    { key: 'remark', label: '备注', type: 'textarea', full: true },
  ],
  repair_complete: [
    { key: 'actualCost', label: '实际费用', type: 'number' },
    { key: 'remark', label: '备注', type: 'textarea', full: true },
  ],
  transfer_start: [
    { key: 'targetDepartment', label: '目标部门', type: 'text' },
    { key: 'targetFloor', label: '目标楼层', type: 'text' },
    { key: 'targetUserId', label: '目标使用人', type: 'user', full: true },
    { key: 'reason', label: '调拨原因', type: 'textarea', full: true },
    { key: 'remark', label: '备注', type: 'textarea', full: true },
  ],
  transfer_complete: [{ key: 'remark', label: '备注', type: 'textarea', full: true }],
  scrap: [
    { key: 'reason', label: '报废原因', type: 'textarea', required: true, full: true },
    { key: 'remark', label: '备注', type: 'textarea', full: true },
  ],
};

export interface OperationFormState {
  targetUserId: string;
  expectedReturnDate: string;
  expectedDate: string;
  reason: string;
  remark: string;
  cost: string;
  actualCost: string;
  vendor: string;
  targetDepartment: string;
  targetFloor: string;
}

export const EMPTY_FORM: OperationFormState = {
  targetUserId: '',
  expectedReturnDate: '',
  expectedDate: '',
  reason: '',
  remark: '',
  cost: '',
  actualCost: '',
  vendor: '',
  targetDepartment: '',
  targetFloor: '',
};
