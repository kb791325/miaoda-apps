import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  asc,
  count,
  desc,
  gte,
  isNotNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  attendanceRecordTable,
  courseGeneralTable,
  courseScheduleTable,
  enrollmentLeadTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { shanghaiDayKey } from '@server/src/common/utils/date';
import type {
  AttendanceOverviewResponse,
  ChannelConversionItem,
  ChannelRevenueItem,
  CoursePopularityItem,
  CoursePopularityResponse,
  CourseRevenueItem,
  LeadConversionResponse,
  MonthlyRevenueItem,
  PaymentStatusDistributionItem,
  RevenueResponse,
  WeeklyAttendanceItem,
} from '@shared/report';

const LEAD_STATUS_ORDER: string[] = ['新线索', '跟进中', '已报名', '已流失'];
const PAYMENT_STATUS_ORDER: string[] = ['未缴费', '部分缴费', '已缴清'];
const ATTENDANCE_STATUS_ORDER: string[] = [
  '出勤',
  '迟到',
  '早退',
  '旷课',
  '请假',
];
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

function parseLinkIds(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const ids: unknown = (value as { link_record_ids?: unknown }).link_record_ids;
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.filter((item: unknown): item is string => typeof item === 'string');
}

function round2(value: string | number | null | undefined): number {
  const num: number = Number(value ?? 0);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

function toPercent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
}

function parseMonthKey(dateStr: string): { year: number; month: number } {
  return {
    year: Number(dateStr.slice(0, 4)),
    month: Number(dateStr.slice(5, 7)),
  };
}

/** 返回给定日期所在月的下月 1 日（UTC 0 点），用于月份右开区间边界 */
function nextMonthFirst(dateStr: string): Date {
  const year: number = Number(dateStr.slice(0, 4));
  const month: number = Number(dateStr.slice(5, 7));
  const nextYear: number = month === 12 ? year + 1 : year;
  const nextMonth: number = month === 12 ? 1 : month + 1;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 1));
}

@Injectable()
export class ReportService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  /** 按指定状态顺序归组计数，未知状态追加在末尾 */
  private aggregateStatusCounts(
    rows: Array<{ status: string | null; total: number }>,
    order: string[],
  ): { counts: Array<{ status: string; count: number }>; total: number } {
    const countMap: Map<string, number> = new Map<string, number>();
    let total: number = 0;
    for (const row of rows) {
      const key: string = row.status ?? '未知';
      const value: number = Number(row.total);
      countMap.set(key, (countMap.get(key) ?? 0) + value);
      total += value;
    }
    const counts: Array<{ status: string; count: number }> = order.map(
      (status: string): { status: string; count: number } => ({
        status,
        count: countMap.get(status) ?? 0,
      }),
    );
    for (const [status, value] of countMap) {
      if (!order.includes(status)) {
        counts.push({ status, count: value });
      }
    }
    return { counts, total };
  }

  async getLeadConversion(): Promise<LeadConversionResponse> {
    const statusRows: Array<{ status: string | null; total: number }> =
      await this.db
        .select({ status: enrollmentLeadTable.clueStatus, total: count() })
        .from(enrollmentLeadTable)
        .groupBy(enrollmentLeadTable.clueStatus);

    const channelRows: Array<{
      channel: string | null;
      total: number;
      enrolled: string;
    }> = await this.db
      .select({
        channel: enrollmentLeadTable.sourceChannel,
        total: count(),
        enrolled: sql<string>`count(*) filter (where ${enrollmentLeadTable.clueStatus} = '已报名')`,
      })
      .from(enrollmentLeadTable)
      .groupBy(enrollmentLeadTable.sourceChannel);

    const { counts: statusCounts, total: totalLeads } =
      this.aggregateStatusCounts(statusRows, LEAD_STATUS_ORDER);
    const enrolledCount: number =
      statusCounts.find((r) => r.status === '已报名')?.count ?? 0;

    const channelDetails: ChannelConversionItem[] = channelRows
      .map((row): ChannelConversionItem => {
        const total: number = Number(row.total);
        const enrolled: number = Number(row.enrolled);
        return {
          channel: row.channel ?? '未知',
          total,
          enrolled,
          conversionRate: toPercent(enrolled, total),
        };
      })
      .sort(
        (a: ChannelConversionItem, b: ChannelConversionItem) =>
          b.total - a.total,
      );

    return {
      totalLeads,
      enrolledCount,
      conversionRate: toPercent(enrolledCount, totalLeads),
      statusCounts,
      channelDetails,
    };
  }

  async getRevenue(
    monthStart?: string,
    monthEnd?: string,
  ): Promise<RevenueResponse> {
    const start: string | undefined = monthStart || undefined;
    const end: string | undefined = monthEnd || undefined;
    if (Boolean(start) !== Boolean(end)) {
      throw new BadRequestException(
        'monthStart 与 monthEnd 必须同时提供或同时省略',
      );
    }
    if (start && !DATE_PATTERN.test(start)) {
      throw new BadRequestException('monthStart 格式应为 YYYY-MM-DD');
    }
    if (end && !DATE_PATTERN.test(end)) {
      throw new BadRequestException('monthEnd 格式应为 YYYY-MM-DD');
    }

    const rangeCondition: SQL | undefined =
      start && end
        ? and(
            gte(studentRegistrationTable.enrollmentDate, start),
            lt(
              studentRegistrationTable.enrollmentDate,
              nextMonthFirst(end).toISOString().slice(0, 10),
            ),
          )
        : undefined;

    const summaryRows: Array<{ total: string; studentCount: number }> =
      await this.db
        .select({
          total: sql<string>`coalesce(sum(${studentRegistrationTable.paymentAmount}::numeric), 0)`,
          studentCount: count(),
        })
        .from(studentRegistrationTable)
        .where(rangeCondition);
    const summary: { total: string; studentCount: number } | undefined =
      summaryRows[0];

    const statusRows: Array<{
      status: string | null;
      count: number;
      amount: string;
    }> = await this.db
      .select({
        status: studentRegistrationTable.paymentStatus,
        count: count(),
        amount: sql<string>`coalesce(sum(${studentRegistrationTable.paymentAmount}::numeric), 0)`,
      })
      .from(studentRegistrationTable)
      .where(rangeCondition)
      .groupBy(studentRegistrationTable.paymentStatus);

    const statusMap: Map<string, PaymentStatusDistributionItem> = new Map<
      string,
      PaymentStatusDistributionItem
    >();
    for (const row of statusRows) {
      const key: string = row.status ?? '未知';
      statusMap.set(key, {
        status: key,
        count: Number(row.count),
        amount: round2(row.amount),
      });
    }
    const statusDistribution: PaymentStatusDistributionItem[] =
      PAYMENT_STATUS_ORDER.map(
        (status: string): PaymentStatusDistributionItem =>
          statusMap.get(status) ?? { status, count: 0, amount: 0 },
      );
    for (const [status, item] of statusMap) {
      if (!PAYMENT_STATUS_ORDER.includes(status)) {
        statusDistribution.push(item);
      }
    }

    const monthExpr: SQL = sql`to_char(${studentRegistrationTable.enrollmentDate}, 'YYYY-MM')`;
    const trendRows: Array<{ month: string; revenue: string }> = await this.db
      .select({
        month: sql<string>`to_char(${studentRegistrationTable.enrollmentDate}, 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(${studentRegistrationTable.paymentAmount}::numeric), 0)`,
      })
      .from(studentRegistrationTable)
      .where(and(isNotNull(studentRegistrationTable.enrollmentDate), rangeCondition))
      .groupBy(monthExpr)
      .orderBy(asc(monthExpr));

    const revenueByMonth: Map<string, number> = new Map<string, number>(
      trendRows.map(
        (row): [string, number] => [row.month, round2(row.revenue)],
      ),
    );
    const monthlyTrend: MonthlyRevenueItem[] = this.buildMonthLabels(
      start,
      end,
    ).map(
      (month: string): MonthlyRevenueItem => ({
        month,
        revenue: revenueByMonth.get(month) ?? 0,
      }),
    );

    const channelRows: Array<{ channel: string | null; revenue: string }> =
      await this.db
        .select({
          channel: studentRegistrationTable.sourceChannel,
          revenue: sql<string>`coalesce(sum(${studentRegistrationTable.paymentAmount}::numeric), 0)`,
        })
        .from(studentRegistrationTable)
        .where(rangeCondition)
        .groupBy(studentRegistrationTable.sourceChannel);
    const channelRevenue: ChannelRevenueItem[] = channelRows
      .map(
        (row): ChannelRevenueItem => ({
          channel: row.channel ?? '未知',
          revenue: round2(row.revenue),
        }),
      )
      .sort(
        (a: ChannelRevenueItem, b: ChannelRevenueItem) =>
          b.revenue - a.revenue,
      );

    const courseRevenueTop5: CourseRevenueItem[] =
      await this.getCourseRevenueTop5(start, end);

    return {
      totalRevenue: round2(summary?.total ?? 0),
      studentCount: Number(summary?.studentCount ?? 0),
      statusDistribution,
      monthlyTrend,
      channelRevenue,
      courseRevenueTop5,
      monthStart: start ?? null,
      monthEnd: end ?? null,
    };
  }

  /**
   * 课程收入 TOP5。
   * 口径：一名学员报多门课程时，其缴费金额整体计入每门关联课程（不拆分）。
   */
  private async getCourseRevenueTop5(
    monthStart: string | undefined,
    monthEnd: string | undefined,
  ): Promise<CourseRevenueItem[]> {
    const conditions: SQL[] = [
      isNotNull(studentRegistrationTable.enrollCourse),
    ];
    if (monthStart && monthEnd) {
      const exclusiveEnd: string = nextMonthFirst(monthEnd)
        .toISOString()
        .slice(0, 10);
      conditions.push(
        gte(studentRegistrationTable.enrollmentDate, monthStart),
        lt(studentRegistrationTable.enrollmentDate, exclusiveEnd),
      );
    }
    const studentRows: Array<{ amount: string | null; enroll: unknown }> =
      await this.db
        .select({
          amount: studentRegistrationTable.paymentAmount,
          enroll: studentRegistrationTable.enrollCourse,
        })
        .from(studentRegistrationTable)
        .where(and(...conditions));
    const revenueByCourse: Map<string, number> = this.sumAmountByCourseLink(
      studentRows,
      (row: { amount: string | null }) => Number(row.amount ?? 0),
    );

    const courses: Array<{
      id: string;
      name: string | null;
      baseRecordId: string | null;
    }> = await this.db
      .select({
        id: courseGeneralTable.id,
        name: courseGeneralTable.courseName,
        baseRecordId: courseGeneralTable.baseRecordId,
      })
      .from(courseGeneralTable);

    return courses
      .map((course: { id: string; name: string | null; baseRecordId: string | null }): CourseRevenueItem => ({
        courseId: course.id,
        courseName: course.name ?? '未命名课程',
        revenue: round2(
          (revenueByCourse.get(course.id) ?? 0) +
            (course.baseRecordId
              ? revenueByCourse.get(course.baseRecordId) ?? 0
              : 0),
        ),
      }))
      .filter((item: CourseRevenueItem) => item.revenue > 0)
      .sort(
        (a: CourseRevenueItem, b: CourseRevenueItem) => b.revenue - a.revenue,
      )
      .slice(0, 5);
  }

  /** 按 jsonb link_record_ids 聚合学员金额 */
  private sumAmountByCourseLink(
    rows: Array<{ amount: string | null; enroll: unknown }>,
    valueOf: (row: { amount: string | null }) => number,
  ): Map<string, number> {
    const byLink: Map<string, number> = new Map();
    rows.forEach((row: { amount: string | null; enroll: unknown }) => {
      const ids: string[] = parseLinkIds(row.enroll);
      const value: number = valueOf(row);
      ids.forEach((linkId: string) => {
        byLink.set(linkId, (byLink.get(linkId) ?? 0) + value);
      });
    });
    return byLink;
  }

  /** 无筛选时生成近 6 个月（含当月）标签；有筛选时枚举区间内月份 */
  private buildMonthLabels(
    monthStart?: string,
    monthEnd?: string,
  ): string[] {
    let startKey: { year: number; month: number };
    let endKey: { year: number; month: number };
    if (monthStart && monthEnd) {
      startKey = parseMonthKey(monthStart);
      endKey = parseMonthKey(monthEnd);
    } else {
      const today: string = shanghaiDayKey();
      endKey = parseMonthKey(today);
      startKey = { year: endKey.year, month: endKey.month - 5 };
      while (startKey.month <= 0) {
        startKey = { year: startKey.year - 1, month: startKey.month + 12 };
      }
    }
    const labels: string[] = [];
    let year: number = startKey.year;
    let month: number = startKey.month;
    while (
      (year < endKey.year ||
        (year === endKey.year && month <= endKey.month)) &&
      labels.length < 24
    ) {
      labels.push(`${year}-${String(month).padStart(2, '0')}`);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return labels;
  }

  async getCoursePopularity(): Promise<CoursePopularityResponse> {
    const studentRows: Array<{ enroll: unknown }> = await this.db
      .select({ enroll: studentRegistrationTable.enrollCourse })
      .from(studentRegistrationTable)
      .where(isNotNull(studentRegistrationTable.enrollCourse));
    const enrolledByLink: Map<string, number> = new Map();
    studentRows.forEach((row: { enroll: unknown }) => {
      parseLinkIds(row.enroll).forEach((linkId: string) => {
        enrolledByLink.set(linkId, (enrolledByLink.get(linkId) ?? 0) + 1);
      });
    });

    const scheduleRows: Array<{ courseLink: unknown }> = await this.db
      .select({ courseLink: courseScheduleTable.courseName })
      .from(courseScheduleTable)
      .where(isNotNull(courseScheduleTable.courseName));
    const schedulesByLink: Map<string, number> = new Map();
    scheduleRows.forEach((row: { courseLink: unknown }) => {
      parseLinkIds(row.courseLink).forEach((linkId: string) => {
        schedulesByLink.set(linkId, (schedulesByLink.get(linkId) ?? 0) + 1);
      });
    });

    const courses: Array<{
      id: string;
      name: string | null;
      tuitionFee: string | null;
      baseRecordId: string | null;
    }> = await this.db
      .select({
        id: courseGeneralTable.id,
        name: courseGeneralTable.courseName,
        tuitionFee: courseGeneralTable.tuitionFee,
        baseRecordId: courseGeneralTable.baseRecordId,
      })
      .from(courseGeneralTable);

    const items: CoursePopularityItem[] = courses.map(
      (course: {
        id: string;
        name: string | null;
        tuitionFee: string | null;
        baseRecordId: string | null;
      }): CoursePopularityItem => {
        const baseCount: number = course.baseRecordId
          ? (enrolledByLink.get(course.baseRecordId) ?? 0)
          : 0;
        const baseScheduleCount: number = course.baseRecordId
          ? (schedulesByLink.get(course.baseRecordId) ?? 0)
          : 0;
        return {
          courseId: course.id,
          courseName: course.name ?? '未命名课程',
          tuitionFee:
            course.tuitionFee === null ? null : round2(course.tuitionFee),
          studentCount: (enrolledByLink.get(course.id) ?? 0) + baseCount,
          scheduleCount:
            (schedulesByLink.get(course.id) ?? 0) + baseScheduleCount,
        };
      },
    );
    items.sort(
      (a: CoursePopularityItem, b: CoursePopularityItem) =>
        b.studentCount - a.studentCount,
    );
    return { items };
  }

  async getAttendanceOverview(): Promise<AttendanceOverviewResponse> {
    const statusRows: Array<{ status: string | null; total: number }> =
      await this.db
        .select({ status: attendanceRecordTable.attendanceStatus, total: count() })
        .from(attendanceRecordTable)
        .where(isNotNull(attendanceRecordTable.attendanceStatus))
        .groupBy(attendanceRecordTable.attendanceStatus);

    const { counts: statusCounts, total: totalRecords } =
      this.aggregateStatusCounts(statusRows, ATTENDANCE_STATUS_ORDER);
    const presentCount: number =
      statusCounts.find((r) => r.status === '出勤')?.count ?? 0;

    // 近 4 周（含本周），业务时区 Asia/Shanghai，按周起始日（周一）分组
    const today: string = shanghaiDayKey();
    const todayDate: Date = new Date(`${today}T00:00:00Z`);
    const mondayOffset: number = (todayDate.getUTCDay() + 6) % 7;
    todayDate.setUTCDate(todayDate.getUTCDate() - mondayOffset - 21);
    const firstWeekStart: string = todayDate.toISOString().slice(0, 10);

    const joinCondition: SQL = sql`(${attendanceRecordTable.courseSchedule}->'link_record_ids' @> jsonb_build_array(${courseScheduleTable.id}::text) or (${courseScheduleTable.baseRecordId} is not null and ${attendanceRecordTable.courseSchedule}->'link_record_ids' @> jsonb_build_array(${courseScheduleTable.baseRecordId})))`;
    const weekExpr: SQL<string> = sql<string>`to_char(date_trunc('week', ${courseScheduleTable.classDate})::date, 'YYYY-MM-DD')`;

    const weekRows: Array<{
      weekStart: string;
      present: string;
      total: number;
    }> = await this.db
      .select({
        weekStart: weekExpr,
        present: sql<string>`count(*) filter (where ${attendanceRecordTable.attendanceStatus} = '出勤')`,
        total: count(),
      })
      .from(attendanceRecordTable)
      .innerJoin(courseScheduleTable, joinCondition)
      .where(
        and(
          isNotNull(courseScheduleTable.classDate),
          isNotNull(attendanceRecordTable.attendanceStatus),
          gte(courseScheduleTable.classDate, firstWeekStart),
        ),
      )
      .groupBy(weekExpr)
      .orderBy(asc(weekExpr));

    const weekStats: Map<string, { present: number; total: number }> = new Map<
      string,
      { present: number; total: number }
    >(
      weekRows.map(
        (row): [string, { present: number; total: number }] => [
          row.weekStart,
          { present: Number(row.present), total: Number(row.total) },
        ],
      ),
    );

    const weeklyTrend: WeeklyAttendanceItem[] = [];
    for (let i: number = 0; i < 4; i += 1) {
      const cursor: Date = new Date(`${firstWeekStart}T00:00:00Z`);
      cursor.setUTCDate(cursor.getUTCDate() + i * 7);
      const weekStart: string = cursor.toISOString().slice(0, 10);
      const stats: { present: number; total: number } = weekStats.get(
        weekStart,
      ) ?? { present: 0, total: 0 };
      weeklyTrend.push({
        weekStart,
        presentCount: stats.present,
        totalCount: stats.total,
        attendanceRate: toPercent(stats.present, stats.total),
      });
    }

    return {
      totalRecords,
      presentCount,
      attendanceRate: toPercent(presentCount, totalRecords),
      statusCounts,
      weeklyTrend,
    };
  }
}
