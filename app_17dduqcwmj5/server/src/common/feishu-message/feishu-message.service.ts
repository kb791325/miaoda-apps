import { Injectable, Inject, Logger } from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import type {
  SendFeishuNotificationOneInput,
  SendFeishuNotificationOneOutput,
} from '@shared/plugin-types';

export const SEND_FEISHU_NOTIFICATION_PLUGIN_ID =
  'send_feishu_notification_1';

const ACTION_KEY_SEND_FEISHU_MESSAGE = 'send_feishu_message';

function isFeishuSendResult(
  value: unknown,
): value is SendFeishuNotificationOneOutput {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  return typeof candidate.success === 'boolean';
}

@Injectable()
export class FeishuMessageService {
  private readonly logger = new Logger(FeishuMessageService.name);

  constructor(
    @Inject(CapabilityService) private readonly capabilityService: CapabilityService,
  ) {}

  async sendTextMessage(
    receiverUserId: string,
    text: string,
    title: string = '业务通知',
  ): Promise<SendFeishuNotificationOneOutput> {
    const input: SendFeishuNotificationOneInput = {
      receiverIds: [receiverUserId],
      title,
      content: text,
    };
    try {
      const rawResult: unknown = await this.capabilityService
        .load(SEND_FEISHU_NOTIFICATION_PLUGIN_ID)
        .call(ACTION_KEY_SEND_FEISHU_MESSAGE, input);
      const output: SendFeishuNotificationOneOutput =
        isFeishuSendResult(rawResult) ? rawResult : { success: false };
      this.logger.log(
        `send_feishu_message done: ${JSON.stringify({
          pluginInstanceId: SEND_FEISHU_NOTIFICATION_PLUGIN_ID,
          receiverUserId,
          success: output.success,
        })}`,
      );
      return output;
    } catch (error) {
      this.logger.error(
        `send_feishu_message failed: ${JSON.stringify({
          pluginInstanceId: SEND_FEISHU_NOTIFICATION_PLUGIN_ID,
          actionKey: ACTION_KEY_SEND_FEISHU_MESSAGE,
          outputMode: 'unary',
          inputKeys: Object.keys(input),
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
