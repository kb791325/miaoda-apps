// EXPORTS: maskPhone, maskBankAccount, maskIdCard, maskField, isOverdue, isLowBalance, shouldHighlight, highlightClassName
// 数据脱敏与条件标红工具

/** 手机号脱敏: 138****6403 */
export function maskPhone(raw: string | number | undefined | null): string {
  const s = String(raw ?? '');
  if (s.length < 7) return s;
  return `${s.slice(0, 3)}****${s.slice(-4)}`;
}

/** 银行账号脱敏: AC80****341 (保留前2后4，字母前缀保留) */
export function maskBankAccount(raw: string | number | undefined | null): string {
  const s = String(raw ?? '');
  if (s.length < 6) return s;
  // 匹配字母前缀+数字: AC8076341 → AC80****341
  const m = s.match(/^([A-Za-z]{1,4})(\d+)$/);
  if (m && m[2].length >= 6) {
    const prefix = m[1];
    const digits = m[2];
    return `${prefix}${digits.slice(0, 2)}****${digits.slice(-3)}`;
  }
  // 纯数字: 622202****1234
  if (/^\d{8,}$/.test(s)) return `${s.slice(0, 4)}****${s.slice(-4)}`;
  // 其他: 保留前2字符+****+后3字符
  if (s.length >= 8) return `${s.slice(0, 2)}****${s.slice(-3)}`;
  return `${s.slice(0, 2)}****`;
}

/** 身份证号脱敏: 3201**********1234 */
export function maskIdCard(raw: string | number | undefined | null): string {
  const s = String(raw ?? '');
  if (s.length < 8) return s;
  return `${s.slice(0, 4)}**********${s.slice(-4)}`;
}

/** 按字段 key 决定脱敏策略 */
export function maskField(fieldKey: string, raw: string | number | undefined | null): string {
  const key = fieldKey.toLowerCase();
  if (key === 'phone' || key.includes('phone') || key.includes('手机') || key.includes('电话') || key.includes('contact')) {
    return maskPhone(raw);
  }
  if (key === 'bankaccount' || key.includes('银行账号') || key.includes('bank_account') || key.includes('bankSerial') || key.includes('bank_serial') || key.includes('payAccount') || key.includes('pay_account') || key === 'f6' || key === 'bankNo' || key === 'accountNo') {
    return maskBankAccount(raw);
  }
  if (key === 'idcard' || key.includes('身份证') || key.includes('id_card')) {
    return maskIdCard(raw);
  }
  return String(raw ?? '');
}

/** 日期是否已逾期 (截止日期 < 今天) */
export function isOverdue(dateStr: unknown): boolean {
  if (dateStr === null || dateStr === undefined) return false;
  const d = new Date(String(dateStr));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/** 余额是否低于阈值 (默认 1000) */
export function isLowBalance(amount: string | number | undefined | null, threshold = 1000): boolean {
  const n = Number(amount ?? 0);
  return !Number.isNaN(n) && n < threshold;
}

/** 无条件标红 (安全库存低于阈值、考勤异常、登录异常、余额不足等) */
export function shouldHighlight(
  fieldKey: string,
  value: string | number | undefined | null,
  recordValues?: Record<string, string | number>,
): boolean {
  // 余额不足
  if (fieldKey === 'balance' && isLowBalance(value)) return true;
  // 逾期
  if (
    (fieldKey === 'dueDate' || fieldKey === 'expireDate' || fieldKey === 'returnDate' || fieldKey === 'planEnd') &&
    isOverdue(value)
  ) {
    return true;
  }
  // 安全库存预警 — 库存量低于阈值
  if (fieldKey === 'stockQty' && Number(value ?? 0) < 10) return true;
  if (fieldKey === 'safeStock' && recordValues) {
    const current = Number(recordValues['stockQty'] ?? 0);
    const safe = Number(value ?? 0);
    if (safe > 0 && current < safe) return true;
  }
  // 考勤异常状态 — 迟到/早退/缺勤/异常 标红
  const abnormalAttendance = ['迟到', '早退', '缺勤', '异常'];
  if ((fieldKey === 'f9' || fieldKey === 'attendanceStatus' || fieldKey === 'status') &&
      typeof value === 'string' && abnormalAttendance.includes(value)) return true;
  // 签到异常 — 未签到/迟到 标红
  const abnormalSignIn = ['未签到', '迟到'];
  if ((fieldKey === 'status') &&
      typeof value === 'string' && abnormalSignIn.includes(value)) return true;
  return false;
}

/** 标红 className */
export function highlightClassName(highlighted: boolean): string {
  return highlighted ? 'text-destructive font-semibold' : '';
}