import { useMemo, useState } from 'react';
import { Eye, Loader2, Plus, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import type { PromptTemplateEffectEvaluationOneInput, PromptTemplateEffectEvaluationOneOutput } from '@shared/plugin-types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import ReportCard from '@/components/ReportCard';
import SectionHeader from '@/components/SectionHeader';
import StatusBadge from '@/components/StatusBadge';
import { IPromptTemplate, PROMPT_MODEL_OPTIONS, PROMPT_TYPE_OPTIONS } from '@/data/prompts';
import { addPrompt, persistErrorText, updatePrompt, useWorkshop } from '@/lib/store';

const PROMPT_EVAL_PLUGIN_ID = 'prompt_template_effect_evaluation_1';
const LEVEL_SCORES: { keyword: string; score: number; label: string }[] = [
  { keyword: '优秀', score: 92, label: '优秀' },
  { keyword: '良好', score: 85, label: '良好' },
  { keyword: '一般', score: 74, label: '一般' },
  { keyword: '待优化', score: 60, label: '待优化' },
];

function scoreTone(score: number): 'success' | 'accent' | 'warning' | 'danger' {
  if (score >= 90) return 'success';
  if (score >= 80) return 'accent';
  if (score >= 70) return 'warning';
  return 'danger';
}

function DetailDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (v: boolean) => void; template: IPromptTemplate | null }) {
  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-2xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">{template.templateName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={template.type} tone="accent" />
            <StatusBadge label={`适用：${template.applicableModel}`} tone="info" />
            <StatusBadge label={`使用 ${template.usageCount} 次`} tone="muted" />
            <StatusBadge label={`效果评分 ${template.avgEffectScore}`} tone={scoreTone(template.avgEffectScore)} />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">提示词内容</div>
            <pre className="whitespace-pre-wrap border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-[11px] leading-relaxed text-slate-700">{template.promptContent}</pre>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">变量说明</div>
            <p className="border border-[#E2E8F0] p-3 text-[11px] font-medium leading-relaxed text-slate-600">{template.variableDescription || '无变量'}</p>
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            创建于 {template.createdAt} · 更新于 {template.updatedAt}
          </div>
        </div>
        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePromptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [templateName, setTemplateName] = useState('');
  const [type, setType] = useState('爆款分析');
  const [applicableModels, setApplicableModels] = useState<string[]>(['豆包']);
  const [promptContent, setPromptContent] = useState('');
  const [variableDescription, setVariableDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!templateName.trim()) {
      toast.error('请填写模板名称');
      return;
    }
    if (!promptContent.trim()) {
      toast.error('请填写提示词内容');
      return;
    }
    setSaving(true);
    try {
      // 先写入多维表格，成功后才清空表单并关弹窗；失败保留内容供重试
      await addPrompt({
        templateName: templateName.trim(),
        type,
        applicableModel: applicableModels.length > 0 ? applicableModels.join(' / ') : '通用',
        promptContent: promptContent.trim(),
        variableDescription: variableDescription.trim(),
        usageCount: 0,
        avgEffectScore: 0,
      });
      toast.success('模板已创建，可通过 AI 评估获得效果评分');
      setTemplateName('');
      setType('爆款分析');
      setApplicableModels(['豆包']);
      setPromptContent('');
      setVariableDescription('');
      onOpenChange(false);
    } catch (error) {
      toast.error(persistErrorText(error, '模板创建失败，内容已保留'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-2xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">新建提示词模板</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">模板名称 *</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="如：标题党优化提示词" className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">类型</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {PROMPT_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">适用模型</Label>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_MODEL_OPTIONS.map((model) => {
                const active = applicableModels.includes(model);
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setApplicableModels(active ? applicableModels.filter((m) => m !== model) : [...applicableModels, model])}
                    className={`rounded-none border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      active ? 'border-[#0033A0] bg-[#0033A0] text-white' : 'border-[#E2E8F0] bg-white text-slate-500 hover:border-[#0033A0]/40 hover:text-[#0033A0]'
                    }`}
                  >
                    {model}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">提示词内容 *</Label>
            <Textarea value={promptContent} onChange={(e) => setPromptContent(e.target.value)} placeholder="支持 {{变量}} 占位符" className="min-h-28 rounded-none font-mono text-xs" />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">变量说明</Label>
            <Textarea value={variableDescription} onChange={(e) => setVariableDescription(e.target.value)} placeholder="如：{{主题}}：视频核心主题" className="min-h-16 rounded-none" />
          </div>
        </div>
        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">取消</Button>
          <Button type="button" onClick={handleCreate} disabled={saving} className="rounded-none">{saving ? '创建中…' : '创建模板'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PromptTemplatePage() {
  const { prompts } = useWorkshop();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [detail, setDetail] = useState<IPromptTemplate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return prompts.filter(
      (p) =>
        (typeFilter === 'all' || p.type === typeFilter) &&
        (!kw || p.templateName.toLowerCase().includes(kw) || p.applicableModel.toLowerCase().includes(kw) || p.promptContent.toLowerCase().includes(kw)),
    );
  }, [prompts, keyword, typeFilter]);

  async function handleEvaluate(template: IPromptTemplate) {
    if (!template.promptContent.trim()) {
      toast.error('模板内容为空，无法评估');
      return;
    }
    setEvaluatingId(template.id);
    try {
      const info = [
        `模板名称：${template.templateName}`,
        `类型：${template.type}`,
        `适用模型：${template.applicableModel}`,
        `提示词内容：${template.promptContent}`,
        `变量说明：${template.variableDescription || '无'}`,
        `历史使用次数：${template.usageCount}`,
      ].join('\n');
      const input = { prompt_template_info: info } satisfies PromptTemplateEffectEvaluationOneInput;
      const result = await capabilityClient
        .load(PROMPT_EVAL_PLUGIN_ID)
        .call<PromptTemplateEffectEvaluationOneOutput>('aiCategorize', input);
      const category = result.categories?.[0] ?? '一般';
      const matched = LEVEL_SCORES.find((l) => category.includes(l.keyword)) ?? LEVEL_SCORES[2];
      // 先写入多维表格，成功后才更新本地评分
      await updatePrompt(template.id, { avgEffectScore: matched.score, usageCount: template.usageCount + 1 });
      toast.success(`AI 评估完成：「${template.templateName}」效果等级 ${matched.label}（${matched.score} 分）`);
    } catch (error) {
      logger.error('prompt evaluation failed:', String(error));
      toast.error(persistErrorText(error, 'AI 评估失败'));
    } finally {
      setEvaluatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeader number="04" title="提示词模板库" subtitle="Reusable AI prompt templates" />
        <Button type="button" className="mb-6 shrink-0 rounded-none" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> 新建模板
        </Button>
      </div>

      {/* 筛选面板 */}
      <ReportCard className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索模板名称 / 适用模型" className="rounded-none pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full rounded-none md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">全部类型</SelectItem>
              {PROMPT_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-[10px] font-bold text-slate-400">显示 {filtered.length} / {prompts.length} 个模板</div>
        </div>
      </ReportCard>

      {/* 模板表格 */}
      <ReportCard className="p-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
                <TableHead className="whitespace-nowrap py-2 text-[9px] font-black uppercase text-slate-400">模板名称</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">类型</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">适用模型</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">使用次数</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">平均效果评分</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">更新时间</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[11px] font-medium text-slate-400">当前筛选条件下没有模板</TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="border-b border-[#E2E8F0] transition-colors hover:bg-slate-50">
                    <TableCell className="max-w-[220px] py-2.5">
                      <button type="button" className="truncate text-xs font-bold text-[#0033A0] hover:underline" onClick={() => { setDetail(p); setDetailOpen(true); }}>
                        {p.templateName}
                      </button>
                    </TableCell>
                    <TableCell><StatusBadge label={p.type} tone="accent" /></TableCell>
                    <TableCell><span className="text-[11px] font-medium text-slate-600">{p.applicableModel}</span></TableCell>
                    <TableCell className="text-right text-xs font-mono text-slate-500">{p.usageCount}</TableCell>
                    <TableCell>
                      {p.avgEffectScore > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-14 bg-slate-100">
                            <div className="h-full bg-[#0033A0]" style={{ width: `${p.avgEffectScore}%` }} />
                          </div>
                          <StatusBadge label={String(p.avgEffectScore)} tone={scoreTone(p.avgEffectScore)} />
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">未评估</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-slate-400">{p.updatedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-none px-2 text-[11px]" onClick={() => { setDetail(p); setDetailOpen(true); }}>
                          <Eye className="size-3.5" /> 详情
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-none px-2 text-[11px]"
                          disabled={evaluatingId === p.id}
                          onClick={() => handleEvaluate(p)}
                        >
                          {evaluatingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                          AI 评估
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ReportCard>

      <DetailDialog open={detailOpen} onOpenChange={setDetailOpen} template={detail} />
      <CreatePromptDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
