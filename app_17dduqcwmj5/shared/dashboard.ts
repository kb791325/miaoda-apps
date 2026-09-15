export interface DashboardTodoSummary {
  pendingReviewCount: number;
  nearFullScheduleCount: number;
  unpaidStudentCount: number;
}

export interface DashboardOverview {
  monthlyNewStudents: number;
  activeStudents: number;
  unpaidStudentCount: number;
  weeklyCourseCount: number;
  todo: DashboardTodoSummary;
}

export interface EnrollmentTrendItem {
  date: string;
  newStudentCount: number;
  paymentAmount: number;
}

export interface EnrollmentTrendResponse {
  items: EnrollmentTrendItem[];
}

export interface ChannelDistributionItem {
  channel: string;
  studentCount: number;
}

export interface ChannelDistributionResponse {
  items: ChannelDistributionItem[];
}
