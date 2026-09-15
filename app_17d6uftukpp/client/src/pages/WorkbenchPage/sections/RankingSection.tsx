import { memo, useMemo } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { IBizRecord } from '@/data/mt-records';
import { formatMoneyCompact } from '@/lib/format';
import { toPlainText } from '@/lib/link-utils';

interface RankingSectionProps {
  contracts: IBizRecord[];
  customers: IBizRecord[];
}

/** 合同金额排行榜 + 目标进度 */
export default memo(function RankingSection({ contracts, customers }: RankingSectionProps) {
  const topContracts = useMemo(() => {
    // 建立客户 recordId -> 客户名称映射
    const customerNameMap = new Map<string, string>();
    const customerNameSet = new Set<string>();
    customers.forEach((c) => {
      const id = String(c.recordId ?? '');
      const name = String(c.values.name ?? c.values.customerName ?? c.values.f3 ?? '');
      if (id && name) customerNameMap.set(id, name);
      if (name) customerNameSet.add(name);
    });

    const grouped: Record<string, { name: string; total: number }> = {};
    contracts.forEach((c) => {
      // 文本外键「关联客户ID」: 多维表格 Text 字段, 存储客户 record_id
      let customerRef = toPlainText(c.values['关联客户ID']);
      // 兜底字段: customerId / customer_id / partner / n / customerName
      if (!customerRef) {
        customerRef = String(c.values.customerId ?? c.values.customer_id ?? c.values.partner ?? c.values.n ?? c.values.customerName ?? '');
      }
      // 先按 recordId 匹配
      let name = customerNameMap.get(customerRef);
      // 再按名称匹配(n 字段可能直接存的是客户名称)
      if (!name && customerRef && customerNameSet.has(customerRef)) {
        name = customerRef;
      }
      // 从合同自身字段解析客户名
      if (!name) {
        const contractName = String(c.values.contractName ?? c.values.name ?? '');
        for (const custName of customerNameSet) {
          if (custName && contractName.includes(custName)) {
            name = custName;
            break;
          }
        }
      }
      // 最终兜底
      const displayName = name || customerRef || '未命名客户';
      if (!grouped[displayName]) grouped[displayName] = { name: displayName, total: 0 };
      grouped[displayName].total += Number(c.values.amount ?? 0);
    });
    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [contracts, customers]);

  const totalCustom = customers.length;
  const activeCustomers = customers.filter((c) => {
    const s = String(c.values.followStatus ?? c.values.status ?? '');
    return s !== '流失' && s !== '已无效';
  }).length;
  const totalContractAmt = contracts.reduce((s, c) => s + Number(c.values.amount ?? 0), 0);
  const activeContractAmt = contracts
    .filter((c) => {
      const s = String(c.values.status ?? '');
      return s === 'active' || s === '生效' || s === '审批中' || s === 'reviewing';
    })
    .reduce((s, c) => s + Number(c.values.amount ?? 0), 0);

  const goals = [
    { label: '活跃客户占比', current: activeCustomers, max: Math.max(totalCustom, 1), unit: '个' },
    { label: '生效合同金额占比', current: activeContractAmt, max: Math.max(totalContractAmt, 1), unit: '¥', money: true },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">排行榜与目标进度</CardTitle>
        <CardDescription>合同金额 TOP 5 客户 + 关键目标进度</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 排行榜 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trophy className="size-3.5 text-warning" />
            合同金额 TOP 5
          </div>
          {topContracts.map((item, i) => {
            const colors = ['text-warning', 'text-muted-foreground', 'text-muted-foreground/70', 'text-muted-foreground/50', 'text-muted-foreground/40'];
            return (
              <div key={item.name} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 text-xs font-bold tabular-nums ${colors[i]}`}>#{i + 1}</span>
                  <span className="truncate text-xs font-medium">{item.name}</span>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatMoneyCompact(item.total)}
                </span>
              </div>
            );
          })}
          {topContracts.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">暂无合同数据</p>
          )}
        </div>

        {/* 目标进度 */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-primary" />
            关键目标进度
          </div>
          {goals.map((g) => {
            const pct = Math.round((g.current / g.max) * 100);
            return (
              <div key={g.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className="tabular-nums font-medium">
                    {g.money ? formatMoneyCompact(g.current) : g.current}
                    <span className="text-muted-foreground"> / {g.money ? formatMoneyCompact(g.max) : g.max}</span>
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">{pct}%</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});