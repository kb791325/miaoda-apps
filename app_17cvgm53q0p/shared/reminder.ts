export interface ReminderRenderContext {
  customerName: string;
  salesName: string;
  nextFollowDate: string;
  salesStage: string;
}

export interface ReminderPlaceholderOption {
  placeholder: string;
  label: string;
}

export const REMINDER_PLACEHOLDER_OPTIONS: ReminderPlaceholderOption[] = [
  { placeholder: '{customerName}', label: '客户名称' },
  { placeholder: '{salesName}', label: '负责销售' },
  { placeholder: '{nextFollowDate}', label: '下次跟进日期' },
  { placeholder: '{salesStage}', label: '销售阶段' },
];

export const DEFAULT_REMINDER_TEMPLATE =
  '【跟进提醒】{salesName} 您好，您负责的客户「{customerName}」' +
  '（销售阶段：{salesStage}）下次跟进日期为 {nextFollowDate}，' +
  '请及时跟进并在系统中记录跟进结果。';

export function renderReminderMessage(
  template: string,
  ctx: ReminderRenderContext,
): string {
  const values: Record<string, string> = {
    '{customerName}': ctx.customerName || '-',
    '{salesName}': ctx.salesName || '-',
    '{nextFollowDate}': ctx.nextFollowDate || '-',
    '{salesStage}': ctx.salesStage || '-',
  };
  let result: string = template;
  for (const option of REMINDER_PLACEHOLDER_OPTIONS) {
    result = result.split(option.placeholder).join(values[option.placeholder]);
  }
  return result;
}

export interface ReminderSettingResponse {
  template: string;
}

export interface SaveReminderSettingRequest {
  template: string;
}

export interface SendReminderRequest {
  customerId: string;
  customerName: string;
  message: string;
}

export interface SendReminderResponse {
  id: string;
  sentAt: string;
  receiverName: string;
}

export type ReminderBlockCode =
  | 'owner_missing'
  | 'owner_invalid'
  | 'owner_not_found'
  | 'owner_no_feishu';

export interface ReminderDraftResponse {
  ownerId: string;
  ownerName: string;
  nextFollowDate: string;
  salesStage: string;
  blockReason: string;
  blockCode?: ReminderBlockCode;
}

export interface LatestReminderItem {
  customerId: string;
  sentAt: string;
  ownerName: string;
}

export interface LatestRemindersResponse {
  items: LatestReminderItem[];
}
