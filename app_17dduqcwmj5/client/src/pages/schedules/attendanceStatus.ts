/** 考勤状态彩色标签样式：出勤绿 / 迟到早退琥珀 / 旷课红 / 请假蓝 */
const ATTENDANCE_STATUS_BADGE_CLASS: Record<string, string> = {
  出勤: 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_30%)]',
  迟到: 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]',
  早退: 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]',
  旷课: 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]',
  请假: 'bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_70%_40%)]',
};

export const getAttendanceBadgeClass = (status: string | null): string => {
  if (status === null || status === '') {
    return 'bg-muted text-muted-foreground';
  }
  return ATTENDANCE_STATUS_BADGE_CLASS[status] ?? 'bg-muted text-muted-foreground';
};

