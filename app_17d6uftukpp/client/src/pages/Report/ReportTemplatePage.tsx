import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileBarChart2, Play, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PRESET_TEMPLATES, fetchCustomTemplates, removeCustomTemplate, type ReportTemplate } from '@/lib/report';
import { MODULES } from '@/config/modules';

const CHART_LABEL: Record<string, string> = {
  bar: '柱状图',
  hbar: '条形图',
  pie: '饼图',
  line: '折线趋势',
  table: '数据表',
  kpi: '指标卡',
};
/** 报表模板: 10 张系统预设 + 用户保存在多维表格中的自定义模板, 一键套用 */
export default function ReportTemplatePage() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [category, setCategory] = useState('全部');
  const [mine, setMine] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchCustomTemplates()
      .then((list) => alive && setMine(list))
      .catch(() => alive && toast.error('自定义模板读取失败, 请检查多维表格连接'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [version]);

  const templates = useMemo(() => [...PRESET_TEMPLATES, ...mine], [mine]);
  const categories = useMemo(() => ['全部', ...Array.from(new Set(templates.map((t) => t.category)))], [templates]);
  const shown = category === '全部' ? templates : templates.filter((t) => t.category === category);
  const preset = shown.filter((t) => t.preset);
  const mineShown = shown.filter((t) => !t.preset);

  const handleUseTemplate = useCallback((t: ReportTemplate) => {
    navigate(`/report/custom?tpl=${t.id}`);
  }, [navigate]);
  const removeMine = async (id: string) => {
    try {
      await removeCustomTemplate(id);
      setVersion((v) => v + 1);
      toast.success('已删除自定义模板');
    } catch {
      toast.error('删除失败, 请稍后重试');
    }
  };

  const renderCard = (t: ReportTemplate) => {
    const src = MODULES[t.source];
    return (
      <Card key={t.id} className="flex flex-col transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileBarChart2 className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm">{t.name}</CardTitle>
                <CardDescription className="text-xs">{src ? `${src.label} · ${src.noun}` : t.source}</CardDescription>
              </div>
            </div>
            {t.preset ? (
              <Badge variant="secondary" className="gap-1">
                <Star className="size-3" /> 预设
              </Badge>
            ) : (
              <Badge variant="outline">我的</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="outline">{t.category}</Badge>
            <Badge variant="outline">{CHART_LABEL[t.chartType] ?? t.chartType}</Badge>
            <Badge variant="outline">{t.scope}</Badge>
            <Badge variant="outline">指标: {t.measure}</Badge>
          </div>
          <div className="mt-auto flex gap-2 pt-1">
            <Button size="sm" className="flex-1" onClick={() => handleUseTemplate(t)}>
              <Play className="size-4" /> 使用模板
            </Button>
            {!t.preset ? (
              <Button size="sm" variant="outline" onClick={() => removeMine(t.id)}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">报表模板</h2>
          <p className="mt-1 text-sm text-muted-foreground">系统预置 10 张常用经营/财务/业务报表, 自定义模板实时保存在多维表格「报表模板」表中</p>
        </div>
        <div className="w-44">
          <NativeSelect className="w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">系统预设模板（{preset.length}）</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{preset.map(renderCard)}</div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">我的模板（{mineShown.length}）</h3>
        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">正在从多维表格读取…</CardContent>
          </Card>
        ) : mineShown.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有自定义模板, 前往「自定义报表」配置后点击「保存为模板」即可在此复用
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{mineShown.map(renderCard)}</div>
        )}
      </section>
    </div>
  );
}
