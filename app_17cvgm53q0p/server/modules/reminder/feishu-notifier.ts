import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import type {
  FollowUpReminderNotifyOneInput,
  FollowUpReminderNotifyOneOutput,
} from '@shared/plugin-types';

const FOLLOW_UP_REMINDER_INSTANCE_ID: string = 'follow_up_reminder_notify_1';
const FOLLOW_UP_REMINDER_ACTION_KEY: string = 'send_feishu_message';

export interface FollowUpReminderNotifyParams {
  receiverIds: string[];
  title: string;
  content: string;
}

@Injectable()
export class FeishuNotifier {
  private readonly logger: Logger = new Logger(FeishuNotifier.name);

  constructor(
    @Inject(CapabilityService)
    private readonly capabilityService: CapabilityService,
  ) {}

  async sendFollowUpReminder(
    params: FollowUpReminderNotifyParams,
  ): Promise<void> {
    const input: FollowUpReminderNotifyOneInput = {
      receiverIds: params.receiverIds,
      title: params.title,
      content: params.content,
    };

    let output: FollowUpReminderNotifyOneOutput;
    try {
      const result: unknown = await this.capabilityService
        .load(FOLLOW_UP_REMINDER_INSTANCE_ID)
        .call(FOLLOW_UP_REMINDER_ACTION_KEY, input);
      output = result as FollowUpReminderNotifyOneOutput;
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `跟进提醒飞书通知发送失败: ${JSON.stringify({
          pluginInstanceId: FOLLOW_UP_REMINDER_INSTANCE_ID,
          actionKey: FOLLOW_UP_REMINDER_ACTION_KEY,
          outputMode: 'unary',
          receiverCount: params.receiverIds.length,
          error: message,
        })}`,
      );
      throw new BadGatewayException(
        `飞书提醒发送失败（instance=${FOLLOW_UP_REMINDER_INSTANCE_ID}, action=${FOLLOW_UP_REMINDER_ACTION_KEY}）: ${message}`,
      );
    }

    if (!output.success) {
      this.logger.error(
        `跟进提醒飞书通知返回失败: ${JSON.stringify({
          pluginInstanceId: FOLLOW_UP_REMINDER_INSTANCE_ID,
          actionKey: FOLLOW_UP_REMINDER_ACTION_KEY,
          receiverCount: params.receiverIds.length,
          success: output.success,
        })}`,
      );
      throw new BadGatewayException(
        `飞书提醒发送失败（instance=${FOLLOW_UP_REMINDER_INSTANCE_ID}, action=${FOLLOW_UP_REMINDER_ACTION_KEY}）: 插件返回 success=false`,
      );
    }
  }
}
