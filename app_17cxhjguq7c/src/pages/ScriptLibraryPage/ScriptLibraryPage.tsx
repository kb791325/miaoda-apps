import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clapperboard, Loader2, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import type { ShortVideoScriptGeneratorOneInput, ShortVideoScriptGeneratorOneOutput } from '@shared/plugin-types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import ReportCard from '@/components/ReportCard';
import SectionHeader from '@/components/SectionHeader';
import StatusBadge from '@/components/StatusBadge';
import { IShot, IScript } from '@/data/scripts';
import { addScript, persistErrorText, updateScript, useWorkshop } from '@/lib/store';

const SCRIPT_AI_PLUGIN_ID = 'short_video_script_generator_1';
const DURATION_OPTIONS = ['15秒', '30秒', '1分钟', '3分钟'];
const CONTENT_TYPES = ['搞笑', '知识', '剧情', '美食', '美妆', '科技', '情感', '旅行', '音乐', '游戏', '其他'];

function parseDuration(requirement: string): number {
  if (requirement.includes('分钟')) return Number(requirement.replace(/[^0-9]/g, '')) * 60;
  return Number(requirement.replace(/[^0-9]/g, '')) || 30;
}

type PartialShot = { sceneDescription?: string; cameraLanguage?: string; dialogue?: string; durationSec?: number; bgmSuggestion?: string; transition?: string };

function parseShots(content: string, totalSec: number): IShot[] {
  const shots: IShot[] = [];
  let current: PartialShot | null = null;

  const flush = () => {
    if (current && (current.sceneDescription || current.dialogue)) {
      shots.push({
        shotNumber: shots.length + 1,
        sceneDescription: current.sceneDescription ?? '—',
        cameraLanguage: current.cameraLanguage ?? '—',
        dialogue: current.dialogue ?? '—',
        durationSec: current.durationSec ?? Math.max(3, Math.round(totalSec / 4)),
        bgmSuggestion: current.bgmSuggestion ?? '—',
        transition: current.transition ?? '无',
      });
    }
    current = null;
  };

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const isStart = /^(?:#+|\*{0,2})\s*(?:分镜|镜头)\s*\d+/i.test(line) || /^(?:#+|\*{0,2})\s*\d+\s*[.、:：]/.test(line);
    if (isStart) {
      flush();
      current = {};
      continue;
    }
    if (!current) continue;
    const grab = (re: RegExp): string | null => {
      const m = line.match(re);
      return m ? m[1].replace(/\*+/g, '').trim() : null;
    };
    const scene = grab(/(?:画面描述|画面)[:：](.+)/);
    if (scene) { current.sceneDescription = scene; continue; }
    const camera = grab(/镜头语言[:：](.+)/);
    if (camera) { current.cameraLanguage = camera; continue; }
    const dialogue = grab(/(?:台词文案|台词|旁白)[:：](.+)/);
    if (dialogue) { current.dialogue = dialogue; continue; }
    const duration = grab(/时长[:：]?\s*(\d+)\s*秒?/);
    if (duration) { current.durationSec = Number(duration) || current.durationSec; continue; }
    const bgm = grab(/BGM[:：](.+)/i);
    if (bgm) { current.bgmSuggestion = bgm; continue; }
    const transition = grab(/转场(?:效果)?[:：](.+)/);
    if (transition) { current.transition = transition; continue; }
  }
  flush();

  if (shots.length === 0) {
    shots.push({
      shotNumber: 1,
      sceneDescription: 'AI 生成的完整脚本内容（未识别出分镜结构，可稍后编辑拆分）',
      cameraLanguage: '—',
      dialogue: content.trim().slice(0, 500),
      durationSec: totalSec,
      bgmSuggestion: '—',
      transition: '无',
    });
  }
  return shots;
}

function GenerateScriptDialog({ open, onOpenChange, defaultTopic }: { open: boolean; onOpenChange: (v: boolean) => void; defaultTopic: string }) {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('知识');
  const [durationReq, setDurationReq] = useState('30秒');
  const [reference, setReference] = useState('');
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTopic(defaultTopic);
      setContentType('知识');
      setDurationReq('30秒');
      setReference('');
      setContent('');
      setDone(false);
    }
  }, [open, defaultTopic]);

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error('请填写视频主题');
      return;
    }
    setGenerating(true);
    setDone(false);
    setContent('');
    try {
      const input = {
        video_topic: topic.trim(),
        content_type: contentType,
        duration_requirement: durationReq,
        reference_material: reference.trim() || undefined,
      } satisfies ShortVideoScriptGeneratorOneInput;
      const stream = await capabilityClient
        .load(SCRIPT_AI_PLUGIN_ID)
        .callStream<ShortVideoScriptGeneratorOneOutput>('textGenerate', input);
      const iterable =
        (stream as { output?: AsyncIterable<ShortVideoScriptGeneratorOneOutput> }).output ??
        (stream as AsyncIterable<ShortVideoScriptGeneratorOneOutput>);
      let full = '';
      for await (const chunk of iterable) {
        const piece = chunk.content ?? '';
        if (piece) {
          full += piece;
          setContent(full);
        }
      }
      setDone(true);
      toast.success('脚本生成完成，可保存至脚本库');
    } catch (error) {
      logger.error('script generation failed:', String(error));
      toast.error('AI 生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    const shots = parseShots(content, parseDuration(durationReq));
    setSaving(true);
    try {
      // 先写入多维表格，成功后才关弹窗；失败保留生成内容供重试
      await addScript({
        scriptTitle: topic.trim(),
        contentType,
        duration: parseDuration(durationReq),
        theme: topic.trim(),
        shots,
      });
      toast.success('脚本已保存至脚本库');
      onOpenChange(false);
    } catch (error) {
      logger.error('script save failed:', String(error));
      toast.error(persistErrorText(error, '脚本保存失败，生成内容已保留'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-2xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">AI 生成分镜脚本</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">视频主题 *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="如：AI视频创作入门" className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">内容类型</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">时长要求</Label>
            <Select value={durationReq} onValueChange={setDurationReq}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">参考素材 / 特殊要求（可选）</Label>
            <Textarea value={reference} onChange={(e) => setReference(e.target.value)} placeholder="参考爆款素材的钩子、节奏或必含信息点" className="min-h-16 rounded-none" />
          </div>
        </div>

        <div className="mt-4">
          <Button type="button" onClick={handleGenerate} disabled={generating} className="w-full rounded-none">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? '生成中，请稍候…' : content ? '重新生成' : '开始生成'}
          </Button>
        </div>

        {(generating || content) && (
          <div className="mt-4 border border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">生成结果</span>
              {generating && <Loader2 className="size-3 animate-spin text-[#0033A0]" />}
              {done && <StatusBadge label="已完成" tone="success" />}
            </div>
            <div className="max-h-72 overflow-y-auto px-4 py-3">
              <article className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '等待生成…'}</ReactMarkdown>
              </article>
            </div>
          </div>
        )}

        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">关闭</Button>
          <Button type="button" onClick={handleSave} disabled={!done || !content || saving} className="rounded-none">{saving ? '保存中…' : '保存至脚本库'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditScriptDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: IScript | null }) {
  const [scriptTitle, setScriptTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [contentType, setContentType] = useState('知识');
  const [shots, setShots] = useState<IShot[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setScriptTitle(editing.scriptTitle);
      setTheme(editing.theme);
      setContentType(editing.contentType);
      setShots(editing.shots.map((s) => ({ ...s })));
    }
  }, [open, editing]);

  function updateShot(index: number, patch: Partial<IShot>) {
    setShots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSave() {
    if (!editing) return;
    if (!scriptTitle.trim()) {
      toast.error('请填写脚本标题');
      return;
    }
    const totalDuration = shots.reduce((sum, s) => sum + (Number(s.durationSec) || 0), 0);
    setSaving(true);
    try {
      // 先写入多维表格，成功后才关弹窗；失败保留编辑内容供重试
      await updateScript(editing.id, {
        scriptTitle: scriptTitle.trim(),
        theme: theme.trim(),
        contentType,
        duration: totalDuration,
        shots: shots.map((s, i) => ({ ...s, shotNumber: i + 1 })),
      });
      toast.success('脚本已更新');
      onOpenChange(false);
    } catch (error) {
      logger.error('script update failed:', String(error));
      toast.error(persistErrorText(error, '脚本更新失败，编辑内容已保留'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-3xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">编辑脚本</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">脚本标题 *</Label>
            <Input value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)} className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">主题</Label>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">内容类型</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">分镜明细（{shots.length} 镜）</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={() =>
              setShots((prev) => [
                ...prev,
                { shotNumber: prev.length + 1, sceneDescription: '', cameraLanguage: '', dialogue: '', durationSec: 5, bgmSuggestion: '', transition: '无' },
              ])
            }
          >
            <Plus className="size-3.5" /> 添加分镜
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {shots.map((shot, index) => (
            <div key={index} className="border border-[#E2E8F0] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">分镜 {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-none text-slate-400 hover:text-[#EF4444]"
                  onClick={() => setShots((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="删除分镜"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">画面描述</Label>
                  <Input value={shot.sceneDescription} onChange={(e) => updateShot(index, { sceneDescription: e.target.value })} className="rounded-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">镜头语言</Label>
                  <Input value={shot.cameraLanguage} onChange={(e) => updateShot(index, { cameraLanguage: e.target.value })} className="rounded-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[10px] font-bold text-slate-400">台词文案</Label>
                  <Textarea value={shot.dialogue} onChange={(e) => updateShot(index, { dialogue: e.target.value })} className="min-h-14 rounded-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">时长（秒）</Label>
                  <Input type="number" value={shot.durationSec} onChange={(e) => updateShot(index, { durationSec: Number(e.target.value) || 0 })} className="rounded-none" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">转场效果</Label>
                  <Input value={shot.transition} onChange={(e) => updateShot(index, { transition: e.target.value })} className="rounded-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[10px] font-bold text-slate-400">BGM 建议</Label>
                  <Input value={shot.bgmSuggestion} onChange={(e) => updateShot(index, { bgmSuggestion: e.target.value })} className="rounded-none" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">取消</Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="rounded-none">{saving ? '保存中…' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ScriptLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scripts } = useWorkshop();
  const [genOpen, setGenOpen] = useState(false);
  const [defaultTopic, setDefaultTopic] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<IScript | null>(null);

  useEffect(() => {
    const theme = (location.state as { theme?: string } | null)?.theme;
    if (theme) {
      setDefaultTopic(theme);
      setGenOpen(true);
    }
  }, [location.state]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeader number="01" title="分镜脚本库" subtitle="AI generated storyboard scripts" />
        <Button type="button" className="mb-6 shrink-0 rounded-none" onClick={() => setGenOpen(true)}>
          <Sparkles className="size-4" /> AI 生成脚本
        </Button>
      </div>

      <ReportCard className="p-0">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] p-4">
          <span className="text-xs font-bold text-slate-800">脚本列表</span>
          <span className="text-[10px] font-bold tabular-nums text-slate-400">{scripts.length} 个脚本</span>
        </div>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
                <TableHead className="whitespace-nowrap py-2 text-[9px] font-black uppercase text-slate-400">脚本标题</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">内容类型</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">主题</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">总时长（秒）</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">分镜数</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">更新时间</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scripts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[11px] font-medium text-slate-400">暂无脚本，点击右上角「AI 生成脚本」创建第一个脚本</TableCell>
                </TableRow>
              ) : (
                scripts.map((s) => (
                  <TableRow key={s.id} className="border-b border-[#E2E8F0] transition-colors hover:bg-slate-50">
                    <TableCell className="max-w-[220px] py-2.5">
                      <Link to={`/scripts/${s.id}`} className="truncate text-xs font-bold text-[#0033A0] hover:underline">
                        {s.scriptTitle}
                      </Link>
                    </TableCell>
                    <TableCell><StatusBadge label={s.contentType} tone="info" /></TableCell>
                    <TableCell className="max-w-[160px]"><span className="block truncate text-[11px] font-medium text-slate-600">{s.theme}</span></TableCell>
                    <TableCell className="text-right text-xs font-mono text-slate-500">{s.duration}</TableCell>
                    <TableCell className="text-right text-xs font-mono text-slate-500">{s.shots.length}</TableCell>
                    <TableCell className="text-[11px] font-medium text-slate-400">{s.updatedAt}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="size-7 rounded-none">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-none">
                          <DropdownMenuItem onClick={() => { setEditing(s); setEditOpen(true); }}>
                            <Pencil className="size-3.5" /> 编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/tasks', { state: { linkedScript: s.scriptTitle } })}>
                            <Clapperboard className="size-3.5" /> 生成视频
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/scripts/${s.id}`}>查看详情</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ReportCard>

      <GenerateScriptDialog open={genOpen} onOpenChange={setGenOpen} defaultTopic={defaultTopic} />
      <EditScriptDialog open={editOpen} onOpenChange={setEditOpen} editing={editing} />
    </div>
  );
}
