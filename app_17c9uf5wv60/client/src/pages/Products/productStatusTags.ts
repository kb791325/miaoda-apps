import type { HealthScore } from '@shared/api.interface';

export const WAREHOUSES: string[] = ['上海仓', '北京仓', '广州仓', '成都仓'];

export const ISSUE_TAG_STYLES: Record<string, string> = {
  '缺货': 'rounded-full bg-destructive/10 text-destructive border-destructive/20',
  '积压': 'rounded-full bg-warning/10 text-warning border-warning/20',
  '滞销': 'rounded-full bg-[hsl(270_60%_50%)]/10 text-[hsl(270_60%_40%)] border-[hsl(270_60%_50%)]/20',
  '关注': 'rounded-full bg-warning/10 text-warning border-warning/20',
};

export function getStatusTags(
  productId: string,
  totalQuantity: number,
  safetyStock: number,
  scoreMap: Map<string, HealthScore>,
): { label: string; className: string }[] {
  const score = scoreMap.get(productId);
  if (score?.issues) {
    const matches = Array.from(
      score.issues.matchAll(/\[(缺货|积压|滞销|关注|预警)\]/g),
    );
    if (matches.length > 0) {
      const seen = new Set<string>();
      const tags: { label: string; className: string }[] = [];
      for (const m of matches) {
        const tag = m[1];
        if (seen.has(tag)) continue;
        seen.add(tag);
        tags.push({ label: tag, className: ISSUE_TAG_STYLES[tag] ?? '' });
      }
      return tags;
    }
  }
  if (totalQuantity === 0) {
    return [{ label: '缺货', className: ISSUE_TAG_STYLES['缺货'] }];
  }
  if (safetyStock > 0 && totalQuantity < safetyStock) {
    return [{ label: '低库存', className: ISSUE_TAG_STYLES['缺货'] }];
  }
  return [
    {
      label: '正常',
      className:
        'rounded-full bg-success/10 text-success border-success/20',
    },
  ];
}
