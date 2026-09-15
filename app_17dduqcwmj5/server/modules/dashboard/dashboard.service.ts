import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  sql,
} from 'drizzle-orm';
import {
  courseScheduleTable,
  marketingContent,
  studentRegistrationTable,
} from '@server/database/schema';
import { shanghaiDayKey } from '@server/src/common/utils/date';
import { LeadService } from '../lead/lead.service';
import type {
  ChannelDistributionItem,
  ChannelDistributionResponse,
  DashboardOverview,
  EnrollmentTrendItem,
  EnrollmentTrendResponse,
} from '@shared/dashboard';
import type { LeadTodoResponse } from '@shared/lead';

const TREND_DAY_COUNT: number = 30;
const NEAR_FULL_THRESHOLD: number = 0.2;
const CONTENT_PENDING_REVIEW_STATUS: string = 'pending_review';
const PAID_OFF_STATUS: string = '已缴清';
const ACTIVE_PROGRESS_LIST: string[] = ['未开课', '学习中', '未开始'];
const DAY_MILLIS: number = 86_400_000;
const SHANGHAI_UTC_OFFSET_MILLIS: number = 8 * 3_600_000;

interface StudentAggregateRow {
  unpaidCount: number;
}

interface ScheduleAggregateRow {
  nearFullCount: number;
}

interface TrendAggregateRow {
  date: string | null;
  newStudentCount: number;
  paymentAmount: string;
}

interface ChannelAggregateRow {
  channel: string | null;
  studentCount: number;
}

function formatUtcDay(value: Date): string {
  const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(value);
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly leadService: LeadService,
  ) {}

  async getLeadTodos(): Promise<LeadTodoResponse> {
    return this.leadService.getLeadTodos();
  }

  async getOverview(): Promise<DashboardOverview> {
    const shanghaiNow: Date = new Date(
      Date.now() + SHANGHAI_UTC_OFFSET_MILLIS,
    );
    const monthStartDay: string = formatUtcDay(
      new Date(
        Date.UTC(
          shanghaiNow.getUTCFullYear(),
          shanghaiNow.getUTCMonth(),
          1,
        ),
      ),
    );
    const nextMonthStartDay: string = formatUtcDay(
      new Date(
        Date.UTC(
          shanghaiNow.getUTCFullYear(),
          shanghaiNow.getUTCMonth() + 1,
          1,
        ),
      ),
    );
    const weekStart: Date = new Date(
      shanghaiNow.getTime() -
        ((shanghaiNow.getUTCDay() + 6) % 7) * DAY_MILLIS,
    );
    const weekStartDay: string = formatUtcDay(weekStart);
    const weekEndDay: string = formatUtcDay(
      new Date(weekStart.getTime() + 7 * DAY_MILLIS),
    );

    const [
      studentRows,
      monthlyRows,
      activeRows,
      weekRows,
      scheduleRows,
      pendingRows,
    ] = await Promise.all([
      this.db
        .select({
          unpaidCount: sql<number>`count(*) filter (where ${studentRegistrationTable.paymentStatus} is null or ${studentRegistrationTable.paymentStatus} <> ${PAID_OFF_STATUS})`,
        })
        .from(studentRegistrationTable),
      this.db
        .select({ monthlyNewCount: count() })
        .from(studentRegistrationTable)
        .where(
          and(
            gte(studentRegistrationTable.enrollmentDate, monthStartDay),
            lt(studentRegistrationTable.enrollmentDate, nextMonthStartDay),
          ),
        ),
      this.db
        .select({ activeCount: count() })
        .from(studentRegistrationTable)
        .where(
          inArray(
            studentRegistrationTable.studyProgress,
            ACTIVE_PROGRESS_LIST,
          ),
        ),
      this.db
        .select({ weekCourseCount: count() })
        .from(courseScheduleTable)
        .where(
          and(
            gte(courseScheduleTable.classDate, weekStartDay),
            lt(courseScheduleTable.classDate, weekEndDay),
          ),
        ),
      this.db
        .select({
          nearFullCount: sql<number>`count(*) filter (where ${courseScheduleTable.remainingQuota} is not null and ${courseScheduleTable.enrollmentCapacity} is not null and ${courseScheduleTable.remainingQuota} <= ${courseScheduleTable.enrollmentCapacity} * ${NEAR_FULL_THRESHOLD}::numeric)`,
        })
        .from(courseScheduleTable),
      this.db
        .select({ pendingCount: count() })
        .from(marketingContent)
        .where(eq(marketingContent.status, CONTENT_PENDING_REVIEW_STATUS)),
    ]);

    const studentAgg: StudentAggregateRow = studentRows[0];
    const scheduleAgg: ScheduleAggregateRow = scheduleRows[0];
    const overview: DashboardOverview = {
      monthlyNewStudents: Number(monthlyRows[0].monthlyNewCount),
      activeStudents: Number(activeRows[0].activeCount),
      unpaidStudentCount: Number(studentAgg.unpaidCount),
      weeklyCourseCount: Number(weekRows[0].weekCourseCount),
      todo: {
        pendingReviewCount: Number(pendingRows[0].pendingCount),
        nearFullScheduleCount: Number(scheduleAgg.nearFullCount),
        unpaidStudentCount: Number(studentAgg.unpaidCount),
      },
    };

    this.logger.log(`Dashboard overview: ${JSON.stringify(overview)}`);
    return overview;
  }

  async getEnrollmentTrend(): Promise<EnrollmentTrendResponse> {
    const now: Date = new Date();
    const days: string[] = [];
    for (let i: number = TREND_DAY_COUNT - 1; i >= 0; i -= 1) {
      days.push(shanghaiDayKey(new Date(now.getTime() - i * DAY_MILLIS)));
    }
    const startDay: string = days[0];

    const trendRows: TrendAggregateRow[] = await this.db
      .select({
        date: studentRegistrationTable.enrollmentDate,
        newStudentCount: count(),
        paymentAmount: sql<string>`coalesce(sum(${studentRegistrationTable.paymentAmount}), '0')`,
      })
      .from(studentRegistrationTable)
      .where(
        and(
          isNotNull(studentRegistrationTable.enrollmentDate),
          gte(studentRegistrationTable.enrollmentDate, startDay),
        ),
      )
      .groupBy(studentRegistrationTable.enrollmentDate);

    const aggregateByDate: Map<
      string,
      { newStudentCount: number; paymentAmount: number }
    > = new Map();
    for (const row of trendRows) {
      if (!row.date) {
        continue;
      }
      aggregateByDate.set(row.date, {
        newStudentCount: Number(row.newStudentCount),
        paymentAmount: Number(row.paymentAmount),
      });
    }

    const items: EnrollmentTrendItem[] = days.map((day: string) => {
      const aggregate = aggregateByDate.get(day);
      return {
        date: day,
        newStudentCount: aggregate?.newStudentCount ?? 0,
        paymentAmount: aggregate?.paymentAmount ?? 0,
      };
    });

    this.logger.log(`Enrollment trend days: ${items.length}`);
    return { items };
  }

  async getChannelDistribution(): Promise<ChannelDistributionResponse> {
    const channelRows: ChannelAggregateRow[] = await this.db
      .select({
        channel: studentRegistrationTable.sourceChannel,
        studentCount: count(),
      })
      .from(studentRegistrationTable)
      .where(
        and(
          isNotNull(studentRegistrationTable.sourceChannel),
          ne(studentRegistrationTable.sourceChannel, ''),
        ),
      )
      .groupBy(studentRegistrationTable.sourceChannel)
      .orderBy(desc(sql<number>`count(*)`));

    const items: ChannelDistributionItem[] = channelRows
      .filter((row: ChannelAggregateRow) => Boolean(row.channel?.trim()))
      .map((row: ChannelAggregateRow) => ({
        channel: (row.channel ?? '').trim(),
        studentCount: Number(row.studentCount),
      }));

    this.logger.log(`Channel distribution: ${JSON.stringify(items)}`);
    return { items };
  }
}
