/* 模块五：经营报表与分析看板 共享类型 */

/** GET /api/report/lead-conversion */
export interface LeadStatusCount {
  status: string;
  count: number;
}

export interface ChannelConversionItem {
  channel: string;
  /** 渠道线索总数 */
  total: number;
  /** 渠道已报名数 */
  enrolled: number;
  /** 转化率（百分数，如 33.33 表示 33.33%） */
  conversionRate: number;
}

export interface LeadConversionResponse {
  totalLeads: number;
  enrolledCount: number;
  /** 整体转化率（百分数） */
  conversionRate: number;
  statusCounts: LeadStatusCount[];
  channelDetails: ChannelConversionItem[];
}

/** GET /api/report/revenue?monthStart&monthEnd */
export interface PaymentStatusDistributionItem {
  status: string;
  count: number;
  /** 金额（元，两位小数） */
  amount: number;
}

export interface MonthlyRevenueItem {
  /** 月份 YYYY-MM */
  month: string;
  /** 收入（元，两位小数） */
  revenue: number;
}

export interface ChannelRevenueItem {
  channel: string;
  revenue: number;
}

export interface CourseRevenueItem {
  courseId: string;
  courseName: string;
  revenue: number;
}

export interface RevenueResponse {
  /** 总收入（元，两位小数） */
  totalRevenue: number;
  /** 参与统计的学员人数 */
  studentCount: number;
  statusDistribution: PaymentStatusDistributionItem[];
  monthlyTrend: MonthlyRevenueItem[];
  channelRevenue: ChannelRevenueItem[];
  /** 课程收入 TOP5（口径：一名学员报多门课程时，缴费金额整体计入每门关联课程） */
  courseRevenueTop5: CourseRevenueItem[];
  monthStart: string | null;
  monthEnd: string | null;
}

/** GET /api/report/course-popularity */
export interface CoursePopularityItem {
  courseId: string;
  courseName: string;
  /** 学费（元，两位小数） */
  tuitionFee: number | null;
  /** 报名人数（学员报名课程关联计数） */
  studentCount: number;
  /** 开班排期数 */
  scheduleCount: number;
}

export interface CoursePopularityResponse {
  items: CoursePopularityItem[];
}

/** GET /api/report/attendance-overview */
export interface AttendanceStatusCount {
  status: string;
  count: number;
}

export interface WeeklyAttendanceItem {
  /** 周起始日（周一）YYYY-MM-DD */
  weekStart: string;
  presentCount: number;
  totalCount: number;
  /** 出勤率（百分数） */
  attendanceRate: number;
}

export interface AttendanceOverviewResponse {
  /** 非空状态的考勤记录总数 */
  totalRecords: number;
  presentCount: number;
  /** 总体出勤率（百分数） */
  attendanceRate: number;
  statusCounts: AttendanceStatusCount[];
  weeklyTrend: WeeklyAttendanceItem[];
}
