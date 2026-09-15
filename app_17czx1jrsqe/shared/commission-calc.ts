/**
 * 视频业务提成计算共享纯函数（前端试算 / 结算回写共用，保证所见=所算=所落库）
 *
 * 两种计算方式口径：
 * - 阶梯累进（分段计算）：金额按档分段，每段 = min(金额, 本档止) - 本档起（止为 null 视为无穷大），
 *   各段 × 本档比例后累加。例：0-10万3%、10-50万5%、50万以上8%，业绩 600000 → 31000（综合 5.17%）。
 * - 整体一档（整单按档计提）：按业绩金额落入哪一档，用该档比例对【整单业绩金额】一次性计提（不分段）。
 *   例：同样档位、业绩 600000 落在 50 万以上档 → 600000 × 8% = 48000。
 */
export interface CommissionTier {
  min: number;
  max: number | null;
  rate: number;
}

export interface CommissionCalcResult {
  commission: number;
  rate: number;
}

export interface CommissionRuleLike {
  biz_type?: string;
  calc_mode?: string;
  status?: string;
  applicable_dept?: string;
  updated_at?: string;
  [key: string]: unknown;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** 阶梯配置 parse：兼容 JSON 字符串 / 数组两种形态，坏数据返回空数组 */
export function parseTiersSafe(value: unknown): CommissionTier[] {
  let raw: unknown = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw || '[]');
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: unknown): CommissionTier => {
      const o = (t || {}) as Record<string, unknown>;
      const min = Number(o.min);
      const rate = Number(o.rate);
      return {
        min: Number.isFinite(min) ? min : 0,
        max: o.max === null || o.max === undefined || o.max === '' ? null : Number(o.max),
        rate: Number.isFinite(rate) ? rate : 0,
      };
    });
}

/** 按「阶梯累进 / 整体一档」口径计算提成；mode 缺省按阶梯累进 */
export function calcCommissionByRule(
  calcMode: string,
  tiers: CommissionTier[],
  amount: number,
): CommissionCalcResult {
  const sorted = [...tiers].sort((a: CommissionTier, b: CommissionTier) => a.min - b.min);
  if (calcMode === '整体一档') {
    let hit = sorted.find((t: CommissionTier) => amount >= t.min && (t.max === null || amount < t.max));
    if (!hit) {
      hit = [...sorted].reverse().find((t: CommissionTier) => amount >= t.min) || sorted[0];
    }
    const rate = hit ? hit.rate : 0;
    return { commission: round2((amount * rate) / 100), rate };
  }
  let commission = 0;
  for (const t of sorted) {
    if (amount <= t.min) break;
    const upper = t.max === null ? amount : Math.min(amount, t.max);
    if (upper > t.min) commission += ((upper - t.min) * t.rate) / 100;
  }
  const rate = amount > 0 ? round2((commission / amount) * 100) : 0;
  return { commission: round2(commission), rate };
}

/** 是否启用（是否启用列缺省/空值视为启用，兼容存量数据） */
export function isRuleActive(status: unknown): boolean {
  const s = String(status ?? '');
  return s !== '停用' && s !== 'inactive';
}

/** 规则匹配优先级：业务类型精确匹配 video > 已启用；适用部门精确匹配 > 全部部门；同优先级取更新时间最新 */
export function pickCommissionRule(
  rules: CommissionRuleLike[],
  bizType: string,
  dept?: string,
): CommissionRuleLike | null {
  const active = rules.filter(
    (r: CommissionRuleLike) =>
      String(r.biz_type ?? '').includes(bizType) && isRuleActive(r.status),
  );
  const byUpdated = (a: CommissionRuleLike, b: CommissionRuleLike): number =>
    String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''));
  const deptNorm = (d: unknown): string => {
    const s = String(d ?? '').trim();
    return !s || s === 'all' ? '全部部门' : s;
  };
  if (dept) {
    const exact = active
      .filter((r: CommissionRuleLike) => deptNorm(r.applicable_dept) === dept)
      .sort(byUpdated);
    if (exact.length > 0) return exact[0];
  }
  const fallback = active
    .filter((r: CommissionRuleLike) => deptNorm(r.applicable_dept) === '全部部门')
    .sort(byUpdated);
  return fallback[0] ?? null;
}

/** 档位合法性校验：返回 null=通过，否则中文原因（保存前拦截） */
export function validateTiers(tiers: CommissionTier[]): string | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return '请至少配置 1 个档位';
  const sorted = [...tiers].sort((a: CommissionTier, b: CommissionTier) => a.min - b.min);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const no = i + 1;
    if (!Number.isFinite(t.min) || t.min < 0) return `第${no}档起值必须为非负数字`;
    if (!Number.isFinite(t.rate) || t.rate < 0 || t.rate > 100) return `第${no}档比例必须为 0~100 的数字`;
    if (t.max !== null) {
      if (!Number.isFinite(t.max)) return `第${no}档止值必须为数字或留空表示不设上限`;
      if (t.max <= t.min) return `第${no}档止值必须大于起值`;
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (t.max !== next.min) return `第${no}档与第${no + 1}档区间必须首尾连续（本档止 = 下档起）`;
      }
    } else if (i < sorted.length - 1) {
      return `仅最后一档可不设上限`;
    }
  }
  const last = sorted[sorted.length - 1];
  if (last.max !== null) return '最后一档止值应留空（不设上限）';
  return null;
}
