import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  LatestRemindersResponse,
  ReminderDraftResponse,
  ReminderSettingResponse,
  SaveReminderSettingRequest,
  SendReminderRequest,
  SendReminderResponse,
} from '@shared/reminder';

export async function fetchReminderSetting(): Promise<ReminderSettingResponse> {
  const res = await axiosForBackend.get<ReminderSettingResponse>(
    '/api/reminder-settings',
  );
  return res.data;
}

export async function saveReminderSetting(
  data: SaveReminderSettingRequest,
): Promise<ReminderSettingResponse> {
  const res = await axiosForBackend.put<ReminderSettingResponse>(
    '/api/reminder-settings',
    data,
  );
  return res.data;
}

export async function sendReminder(
  data: SendReminderRequest,
): Promise<SendReminderResponse> {
  const res = await axiosForBackend.post<SendReminderResponse>(
    '/api/reminders',
    data,
  );
  return res.data;
}

export async function fetchLatestReminders(
  customerIds: string[],
): Promise<LatestRemindersResponse> {
  const res = await axiosForBackend.get<LatestRemindersResponse>(
    '/api/reminders/latest',
    { params: { customerIds: customerIds.join(',') } },
  );
  return res.data;
}

export async function fetchReminderDraft(
  customerId: string,
): Promise<ReminderDraftResponse> {
  const res = await axiosForBackend.get<ReminderDraftResponse>(
    '/api/reminders/draft',
    { params: { customerId } },
  );
  return res.data;
}
