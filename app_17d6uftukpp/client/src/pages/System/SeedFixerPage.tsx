import { useState } from 'react';
import { Wrench, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fixAllSeedData, type SeedFixResult } from '@/lib/seed-fixer';
import { toast } from 'sonner';

/** 种子数据修复工具页（仅系统管理员使用，修复后刷新对应页面即可看到新数据） */
export default function SeedFixerPage() {
  const [results, setResults] = useState<SeedFixResult[]>([]);
  const [running, setRunning] = useState(false);

  const handleFix = async () => {
    setRunning(true);
    setResults([]);
    try {
      const res = await fixAllSeedData();
      setResults(res);
      const allOk = res.every((r) => r.errors.length === 0);
      if (allOk) {
        toast.success('全部种子数据修复完成！');
      } else {
        const failed = res.filter((r) => r.errors.length > 0).map((r) => r.table).join('、');
        toast.warning(`部分修复完成，${failed} 有错误`);
      }
    } catch (e) {
      toast.error('修复失败：' + String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">种子数据修复工具</h2>
        <p className="mt-1 text-sm text-muted-foreground">一键修复库存、合同模版、角色权限、系统设置四张表的种子数据，写入多维表格 Base</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4 text-primary" />
            修复范围
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>库存表</strong>：10条物品名称改为真实办公/拍摄物资，库存数量与状态自洽</p>
          <p>• <strong>合同模版表</strong>：10条模版名称改为真实模版，覆盖合同类型与适用行业</p>
          <p>• <strong>角色权限表</strong>：10条改为10个真实角色，配齐数据权限范围与菜单权限</p>
          <p>• <strong>系统设置表</strong>：归并为5类25项真实参数（公海规则/审批流程/编号规则/提成规则/系统参数）</p>
        </CardContent>
      </Card>

      <Button onClick={handleFix} disabled={running} size="lg">
        {running ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Wrench className="size-4 mr-2" />}
        {running ? '正在修复...' : '开始修复'}
      </Button>

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((r) => (
            <Card key={r.table}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {r.errors.length === 0 ? <Check className="size-4 text-success" /> : <X className="size-4 text-destructive" />}
                  {r.table}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>总记录数：<Badge variant="secondary">{r.total}</Badge></p>
                  <p>已更新：<Badge variant={r.updated > 0 ? 'default' : 'outline'}>{r.updated}</Badge></p>
                  {r.errors.length > 0 && (
                    <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      {r.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}