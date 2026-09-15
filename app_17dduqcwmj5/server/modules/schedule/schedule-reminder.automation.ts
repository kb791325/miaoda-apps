import { Inject, Logger } from '@nestjs/common';
import {
  Automation,
  BindTrigger,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, eq, inArray } from 'drizzle-orm';
import { courseScheduleTable } from '@server/database/schema';
import { FeishuMessageService } from '@server/src/common/feishu-message/feishu-message.service';

type ScheduleRow = typeof courseScheduleTable.$inferSelect;

const REMIND_STATUSES: string[] = ['招生中', '已开课'];

@Automation()
export class ScheduleReminderAutomation {
  private readonly logger = new Logger(ScheduleReminderAutomation.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly feishuMessageService: FeishuMessageService,
  ) {}

  private getTomorrowDateStr(): string {
    const now: Date = new Date();
    const shanghaiTime: Date = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const tomorrow: Date = new Date(
      shanghaiTime.getTime() + 24 * 60 * 60 * 1000,
    );
    const year: string = String(tomorrow.getUTCFullYear());
    const month: string = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
    const day: string = String(tomorrow.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  @BindTrigger('schedule_class_reminder')
  async sendClassReminder(): Promise<void> {
    const tomorrow: string = this.getTomorrowDateStr();
    this.logger.log(`开课前提醒任务开始：扫描 ${tomorrow} 的排期`);

    const rows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(
        and(
          eq(courseScheduleTable.classDate, tomorrow),
          inArray(courseScheduleTable.appStatus, REMIND_STATUSES),
        ),
      );

    this.logger.log(`明日排期数量：${rows.length}`);

    for (const row of rows) {
      if (!row.lecturer) {
        this.logger.warn(`排期 ${row.id} 未设置讲师，跳过提醒`);
        continue;
      }
      const content: string = `明天 ${row.startTime ?? ''} 您有课程「${
        row.scheduleName ?? ''
      }」，教室：${row.classroom ?? ''}`;
      try {
        await this.feishuMessageService.sendTextMessage(
          row.lecturer,
          content,
          '开课提醒',
        );
        this.logger.log(`开课提醒已发送：scheduleId=${row.id}`);
      } catch (error) {
        this.logger.error(
          `开课提醒发送失败：scheduleId=${row.id}, error=${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.log('开课前提醒任务结束');
  }
}
