import type { WarningItem, TopValueItem } from '@shared/api.interface';

interface LevelStyle {
  bg: string;
  text: string;
  border: string;
}

/** 健康等级标签：语义 token 双态自动切换 */
const LEVEL_STYLES: Record<string, LevelStyle> = {
  '不健康': { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
  '预警': { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  '需关注': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  '基本健康': { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  '健康': { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
};

function getLevelStyle(level: string): LevelStyle {
  return LEVEL_STYLES[level] ?? LEVEL_STYLES['健康'];
}

function getScoreColor(score: number): string {
  if (score <= 39) return 'text-destructive';
  if (score <= 69) return 'text-warning';
  if (score <= 89) return 'text-primary';
  return 'text-success';
}

export const WarningTable = ({ data }: { data: WarningItem[] }) => {
  const filtered = data.filter((item: WarningItem) => item.level !== '健康');
  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
        所有商品健康状态良好
      </div>
    );
  }
  return (
    <div className="overflow-auto max-h-[400px]">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 left-0 right-0 z-10">
          <tr className="border-b border-border bg-muted">
            <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap text-xs w-12">
              评分
            </th>
            <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap text-xs w-14">
              等级
            </th>
            <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap text-xs">
              商品名称
            </th>
            <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap text-xs w-16">
              品类
            </th>
            <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap text-xs w-14">
              库存
            </th>
            <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap text-xs w-14">
              安全线
            </th>
            <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap text-xs min-w-[220px]">
              预警信息
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item: WarningItem) => {
            const cfg: LevelStyle = getLevelStyle(item.level);
            return (
              <tr key={item.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="p-2 text-center">
                  <span className={`font-mono text-sm font-semibold ${getScoreColor(item.score)}`}>
                    {item.score}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded-sm border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {item.level}
                  </span>
                </td>
                <td className="p-2 text-center text-foreground text-xs">
                  <div className="font-medium truncate" title={item.name}>{item.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate" title={item.code}>{item.code}</div>
                </td>
                <td className="p-2 text-center text-muted-foreground text-xs">
                  <span className="inline-block px-1.5 py-0.5 rounded-sm bg-accent/50 text-accent-foreground text-[11px] truncate max-w-full" title={item.category}>
                    {item.category}
                  </span>
                </td>
                <td className="p-2 text-center font-mono text-xs">
                  <span className={item.currentStock < item.safetyStock ? 'text-destructive font-semibold' : 'text-foreground'}>
                    {item.currentStock}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-0.5">{item.unit}</span>
                </td>
                <td className="p-2 text-center font-mono text-xs text-muted-foreground">
                  {item.safetyStock}
                </td>
                <td className="p-2 text-left text-xs text-muted-foreground align-top">
                  <div
                    className="max-w-[340px] leading-relaxed break-words line-clamp-3"
                    title={item.issues.split('；').join('；\n')}
                  >
                    {item.issues.split('；').map((issue: string, idx: number) => {
                      const isUrgent = issue.includes('[缺货]') || issue.includes('[积压]') || issue.includes('[滞销]');
                      return (
                        <span key={idx}>
                          {idx > 0 && <span className="mx-0.5 text-border">·</span>}
                          <span className={isUrgent ? 'text-foreground font-medium' : ''}>{issue}</span>
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const TopValueTable = ({ data }: { data: TopValueItem[] }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }
  return (
    <div className="overflow-auto h-[300px]">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left p-2 font-medium text-muted-foreground">
              排名
            </th>
            <th className="text-left p-2 font-medium text-muted-foreground">
              商品名称
            </th>
            <th className="text-left p-2 font-medium text-muted-foreground">
              品类
            </th>
            <th className="text-right p-2 font-medium text-muted-foreground">
              库存金额
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={item.id}
              className="border-b border-border"
            >
              <td className="p-2 font-mono text-muted-foreground">
                {idx + 1}
              </td>
              <td className="p-2 text-foreground font-medium">
                {item.name}
              </td>
              <td className="p-2 text-muted-foreground">
                {item.category}
              </td>
              <td className="p-2 text-right font-mono text-foreground">
                ¥{item.totalValue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
