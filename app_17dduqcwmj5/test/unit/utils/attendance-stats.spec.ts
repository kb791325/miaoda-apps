import {
  computeAttendanceStats,
  computeCoreAttendanceRate,
  type AttendanceStatInput,
  type AttendanceStatResult,
} from '../../../server/src/common/utils/attendance-stats';

describe('computeAttendanceStats', () => {
  it('出勤计出席，请假/旷课计缺勤，迟到/早退不计入分母', () => {
    const items: AttendanceStatInput[] = [
      { attendanceStatus: '出勤' },
      { attendanceStatus: '出勤' },
      { attendanceStatus: '请假' },
      { attendanceStatus: '旷课' },
      { attendanceStatus: '迟到' },
      { attendanceStatus: '早退' },
      { attendanceStatus: null },
    ];
    const result: AttendanceStatResult = computeAttendanceStats(items);
    expect(result.presentCount).toBe(2);
    expect(result.absentCount).toBe(2);
    expect(result.attendanceRate).toBe(50);
  });

  it('空列表返回全 0', () => {
    const result: AttendanceStatResult = computeAttendanceStats([]);
    expect(result.presentCount).toBe(0);
    expect(result.absentCount).toBe(0);
    expect(result.attendanceRate).toBe(0);
  });

  it('仅迟到/早退时分母为 0，出勤率为 0', () => {
    const items: AttendanceStatInput[] = [
      { attendanceStatus: '迟到' },
      { attendanceStatus: '早退' },
    ];
    const result: AttendanceStatResult = computeAttendanceStats(items);
    expect(result.attendanceRate).toBe(0);
  });

  it('1/3 类除法四舍五入到 0.1 且无浮点漂移', () => {
    const items: AttendanceStatInput[] = [
      { attendanceStatus: '出勤' },
      { attendanceStatus: '请假' },
      { attendanceStatus: '旷课' },
    ];
    const result: AttendanceStatResult = computeAttendanceStats(items);
    expect(result.attendanceRate).toBe(33.3);
  });
});

describe('computeCoreAttendanceRate', () => {
  it('分母 = 出勤 + 请假 + 旷课', () => {
    expect(computeCoreAttendanceRate(2, 1, 0)).toBe(66.7);
  });

  it('空分母返回 0', () => {
    expect(computeCoreAttendanceRate(0, 0, 0)).toBe(0);
  });

  it('1/3 除法保留 1 位小数、无浮点漂移', () => {
    const rate: number = computeCoreAttendanceRate(1, 1, 1);
    expect(rate).toBe(33.3);
    expect(Number.isInteger(rate * 10)).toBe(true);
  });

  it('全部出勤为 100', () => {
    expect(computeCoreAttendanceRate(5, 0, 0)).toBe(100);
  });
});
