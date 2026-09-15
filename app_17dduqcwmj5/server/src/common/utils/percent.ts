/**
 * 结业档案出勤率归一化为 0~100 百分数。
 * 入库来源有两种口径：应用内登记按课时算出 0~100；
 * 多维表格入站同步的「出勤率」是百分比字段，原始值为 0~1 小数。
 */
export function normalizeAttendancePercent(params: {
  attendanceRate: string | number | null | undefined;
  attendanceHours: string | number | null | undefined;
  totalClassHours: string | number | null | undefined;
}): number {
  const total: number = Number(params.totalClassHours ?? 0);
  if (Number.isFinite(total) && total > 0 && params.attendanceHours !== null) {
    const attended: number = Number(params.attendanceHours ?? 0);
    if (Number.isFinite(attended)) {
      return Math.round((attended / total) * 1000) / 10;
    }
  }
  const raw: number = Number(params.attendanceRate ?? 0);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  if (raw <= 1) {
    return Math.round(raw * 1000) / 10;
  }
  return Math.round(raw * 10) / 10;
}
