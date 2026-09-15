import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Info, Loader2, MoreHorizontal, Pencil, Search, Sparkles, Terminal, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import type { DouyinHotMaterialAnalysisOneInput, DouyinHotMaterialAnalysisOneOutput } from '@shared/plugin-types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import ReportCard from '@/components/ReportCard';
import SectionHeader from '@/components/SectionHeader';
import { MaterialStatusBadge, RatingLevelBadge } from '@/components/StatusBadge';
import { CONTENT_TYPES, DISASSEMBLY_STATUS_LABELS, IMaterial, MATERIAL_TAG_OPTIONS, MaterialInput, RATING_LEVELS } from '@/data/materials';
import { fmtCount } from '@/lib/format';
import { addMaterial, persistErrorText, updateMaterial, useWorkshop } from '@/lib/store';
import { fetchDouyinVideoInfo, extractDouyinUrl, extractDouyinUrlDetail, extractDouyinKeywords, type DouyinVideoInfo, DouyinParseError, type ParseErrorType, type UrlExtractionMethod } from '@/lib/douyin';

/** 将解析错误类型转换为用户可读的友好提示文案 */
function formatParseErrorForUser(type: ParseErrorType, detail?: string): string {
  switch (type) {
    case 'network_timeout':
      return '网络超时：抖音解析请求响应时间过长，可能是网络不稳定，请稍后重试';
    case 'redirect_failed':
      return '短链重定向失败：抖音短链无法跳转到视频页面，链接可能已失效，请检查链接是否正确';
    case 'api_error':
      return `解析服务异常：第三方抖音解析API返回错误（${detail?.slice(0, 60) || '服务不可用'}），已重试多个端点均失败，请稍后重试或手动填写`;
    case 'api_empty_data':
      return '解析返回空数据：API请求成功但未获取到视频信息，可能是视频已删除、私密或链接失效，请检查链接有效性';
    case 'parse_json_failed':
      return '解析数据格式异常：返回内容无法解析为有效数据，解析服务可能已变更，请稍后重试或手动填写';
    case 'unknown':
    default:
      return `抖音视频数据自动获取失败，已自动重试多个端点仍未成功${detail ? `（${detail.slice(0, 50)}）` : ''}，请稍后再试或手动填写`;
  }
}

const MATERIAL_AI_PLUGIN_ID = 'douyin_hot_material_analysis_1';

interface MaterialFormState {
  videoTitle: string;
  douyinLink: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  completionRate: number;
  fiveDimensions: { completionPower: number; interactionPotential: number; contentQuality: number; platformFit: number; spreadPotential: number };
  compositeScore: number;
  ratingLevel: IMaterial['ratingLevel'];
  contentType: string;
  disassemblyStatus: IMaterial['disassemblyStatus'];
  videoScript: string;
  sceneDescription: string;
  hookAnalysis: string;
  bgm: string;
  tags: string[];
}

const EMPTY_FORM: MaterialFormState = {
  videoTitle: '',
  douyinLink: '',
  author: '',
  likes: 0,
  comments: 0,
  shares: 0,
  completionRate: 0,
  fiveDimensions: { completionPower: 0, interactionPotential: 0, contentQuality: 0, platformFit: 0, spreadPotential: 0 },
  compositeScore: 0,
  ratingLevel: 'B',
  contentType: '知识',
  disassemblyStatus: 'pending',
  videoScript: '',
  sceneDescription: '',
  hookAnalysis: '',
  bgm: '',
  tags: [],
};

const DIMENSION_LABELS: { key: keyof MaterialFormState['fiveDimensions']; label: string }[] = [
  { key: 'completionPower', label: '完播力' },
  { key: 'interactionPotential', label: '互动潜力' },
  { key: 'contentQuality', label: '内容质量' },
  { key: 'platformFit', label: '平台适配' },
  { key: 'spreadPotential', label: '传播潜力' },
];

function formFromMaterial(m: IMaterial): MaterialFormState {
  return {
    videoTitle: m.videoTitle,
    douyinLink: m.douyinLink,
    author: m.author,
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
    completionRate: m.completionRate,
    fiveDimensions: { ...m.fiveDimensions },
    compositeScore: m.compositeScore,
    ratingLevel: m.ratingLevel,
    contentType: m.contentType,
    disassemblyStatus: m.disassemblyStatus,
    videoScript: m.videoScript,
    sceneDescription: m.sceneDescription,
    hookAnalysis: m.hookAnalysis,
    bgm: m.bgm,
    tags: [...m.tags],
  };
}

function MaterialFormDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: IMaterial | null }) {
  const [form, setForm] = useState<MaterialFormState>(EMPTY_FORM);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const parseStatusRef = useRef<'idle' | 'parsing' | 'success' | 'failed'>('idle');
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'failed'>('idle');
  const parseErrorRef = useRef('');
  const [parseError, setParseError] = useState('');
  const parseDebugRef = useRef<DouyinVideoInfo['debug'] | null>(null);
  const [parseDebug, setParseDebug] = useState<DouyinVideoInfo['debug'] | null>(null);
  const parseConfidenceRef = useRef<'high' | 'mid' | 'low'>('mid');
  const [parseConfidence, setParseConfidence] = useState<'high' | 'mid' | 'low'>('mid');
  const [debugOpen, setDebugOpen] = useState(false);

  // 数据来源为第三方API时默认展开调试面板，方便用户核对字段映射
  useEffect(() => {
    if (parseDebug?.source === 'third_party_api') {
      setDebugOpen(true);
    }
  }, [parseDebug?.source]);
  // 失败时的各端点调试数据（从错误对象中读取）
  const failedEndpointResultsRef = useRef<Array<{ label: string; status: 'success' | 'failed'; errorType?: string; errorDetail?: string; durationMs?: number }>>([]);
  const [failedEndpointResults, setFailedEndpointResults] = useState<Array<{ label: string; status: 'success' | 'failed'; errorType?: string; errorDetail?: string; durationMs?: number }>>([]);
  // 链接提取元信息（成功/失败都有）
  const urlExtractRef = useRef<{ cleanUrl: string; method: UrlExtractionMethod; rawInputPreview: string } | null>(null);
  const [urlExtract, setUrlExtract] = useState<{ cleanUrl: string; method: UrlExtractionMethod; rawInputPreview: string } | null>(null);
  const aiOkRef = useRef(false);
  const [aiOk, setAiOk] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRunSeqRef = useRef(0);
  const lastAutoLinkRef = useRef('');
  const lastCleanUrlRef = useRef('');

  useEffect(() => {
    if (open) {
      setForm(editing ? formFromMaterial(editing) : { ...EMPTY_FORM });
      lastAutoLinkRef.current = editing?.douyinLink ?? '';
      lastCleanUrlRef.current = '';
      setParseStatus('idle');
      parseStatusRef.current = 'idle';
      setParseError('');
      parseErrorRef.current = '';
      setParseDebug(null);
      parseDebugRef.current = null;
      setParseConfidence('mid');
      parseConfidenceRef.current = 'mid';
      setDebugOpen(false);
      setFailedEndpointResults([]);
      failedEndpointResultsRef.current = [];
      setUrlExtract(null);
      urlExtractRef.current = null;
      setAiOk(false);
      aiOkRef.current = false;
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      autoRunSeqRef.current += 1; // 卸载/重开时废弃上次请求
    };
  }, [open, editing]);

  const runFullAnalysis = useCallback(async (rawLink: string, seq: number) => {
    // 第一步：从粘贴文本中提取有效抖音链接 + 关键词（支持标准链接与抖音口令格式）
    const { cleanUrl, method } = extractDouyinUrlDetail(rawLink);
    const keywords = extractDouyinKeywords(rawLink);
    const hasUrl = Boolean(cleanUrl);

    // 记录链接提取元信息（无论成功失败都展示）
    const rawInputPreview = rawLink.length > 100 ? `${rawLink.slice(0, 100)}…` : rawLink;
    urlExtractRef.current = { cleanUrl, method, rawInputPreview };
    if (seq === autoRunSeqRef.current) {
      setUrlExtract({ cleanUrl, method, rawInputPreview });
    }

    // 完全没有任何可识别内容才直接返回（纯空/纯空白）
    if (!hasUrl && !keywords) {
      parseStatusRef.current = 'failed';
      setParseStatus('failed');
      parseErrorRef.current = '未识别到有效的抖音链接或口令，请粘贴标准抖音链接（如 https://v.douyin.com/xxx/）';
      setParseError('未识别到有效的抖音链接或口令，请粘贴标准抖音链接（如 https://v.douyin.com/xxx/）');
      setAiLoading(false);
      toast.error('未识别到有效的抖音链接，自动解析已取消');
      return;
    }

    setAiLoading(true);
    parseStatusRef.current = 'parsing';
    setParseStatus('parsing');
    parseErrorRef.current = '';
    setParseError('');
    // 清空上次失败的端点结果
    failedEndpointResultsRef.current = [];
    setFailedEndpointResults([]);
    let realInfo: DouyinVideoInfo | null = null;
    let analysisOk = false;
    let errorMsg = '';

    // 第二步：真实数据（标题/作者/点赞/评论/分享），仅来自服务端解析代理，绝不用 AI 估算
    if (hasUrl) {
      try {
        realInfo = await fetchDouyinVideoInfo(cleanUrl);
        parseStatusRef.current = 'success';
        parseDebugRef.current = realInfo.debug || null;
        parseConfidenceRef.current = realInfo.confidence;
        if (seq === autoRunSeqRef.current) {
          setParseStatus('success');
          setParseDebug(realInfo.debug || null);
          setParseConfidence(realInfo.confidence);
        }
      } catch (error) {
        logger.warn('抖音视频解析失败:', String(error));
        const errType: ParseErrorType = error instanceof DouyinParseError ? error.type : 'unknown';
        errorMsg = formatParseErrorForUser(errType, error instanceof DouyinParseError ? error.detail : undefined);
        parseStatusRef.current = 'failed';
        parseErrorRef.current = errorMsg;
        // 保存失败时的端点调试数据
        const errWithResults = error as DouyinParseError & { endpointResults?: typeof failedEndpointResultsRef.current };
        if (errWithResults.endpointResults?.length) {
          failedEndpointResultsRef.current = errWithResults.endpointResults;
        }
        if (seq === autoRunSeqRef.current) {
          setParseStatus('failed');
          setParseError(errorMsg);
          setFailedEndpointResults(failedEndpointResultsRef.current);
          // 失败时自动展开调试面板，方便用户排查
          setDebugOpen(true);
        }
      }
    } else {
      // 口令格式但无 URL：真实数据不可用，走提示而不抛异常
      errorMsg = '当前为抖音口令格式，无法自动获取真实互动数据（点赞/评论/分享），请手动填写或粘贴标准链接重试';
      parseStatusRef.current = 'failed';
      parseErrorRef.current = errorMsg;
      if (seq === autoRunSeqRef.current) {
        setParseStatus('failed');
        setParseError(errorMsg);
      }
    }

    // 第三步：AI 内容拆解（五维评分/画面描述/钩子分析/BGM/标签），不编造互动数据
    // 若 videoScript 为空，则用从口令中提取的关键词作为辅助输入，提升拆解质量
    let aiError = '';
    let aiResult: DouyinHotMaterialAnalysisOneOutput | null = null;
    try {
      const scriptContent = form.videoScript.trim();
      const fallbackContent = keywords || '（未提供文案，请基于视频链接或口令内容推断视频风格）';
      const input = {
        video_url: cleanUrl || '抖音口令分享，无标准链接',
        video_content: scriptContent || fallbackContent,
      } satisfies DouyinHotMaterialAnalysisOneInput;
      aiResult = await capabilityClient
        .load(MATERIAL_AI_PLUGIN_ID)
        .call<DouyinHotMaterialAnalysisOneOutput>('textToJson', input);
      analysisOk = true;
      aiOkRef.current = true;
      if (seq === autoRunSeqRef.current) setAiOk(true);
    } catch (error) {
      logger.error('AI material analysis failed:', String(error));
      aiError = 'AI 内容拆解失败，请稍后重试';
    }

    // 防抖去重：只有最新一次请求才写入结果，避免旧请求覆盖新结果
    if (seq !== autoRunSeqRef.current) return;

    setForm((f) => {
      let next = { ...f };
      if (realInfo) {
        next = {
          ...next,
          videoTitle: realInfo.videoTitle,
          author: realInfo.author,
          likes: realInfo.likes,
          comments: realInfo.comments,
          shares: realInfo.shares,
        };
      }
      if (aiResult) {
        const toTagList = (arr: unknown[]) =>
          (arr ?? [])
            .map((t) => (typeof t === 'string' ? t : String((t as { tag?: string }).tag ?? '')))
            .filter(Boolean);
        const tags = Array.from(
          new Set([...toTagList(aiResult.tags).slice(0, 8), ...toTagList(aiResult.emotion_tags).slice(0, 5)]),
        );
        const rawLevel = String(aiResult.score_level ?? '').toUpperCase();
        const level: IMaterial['ratingLevel'] = rawLevel === 'S' ? 'S' : rawLevel === 'A' ? 'A' : rawLevel === 'B' ? 'B' : 'C';
        const dims = aiResult;
        const rawType = String(dims.content_type ?? '').trim();
        // 注意：videoTitle / author / likes / comments / shares 仅来自解析代理的真实结果，
        // AI 输出的 video_title / author_name / like_count 等估算值一律不采用
        next = {
          ...next,
          contentType: CONTENT_TYPES.includes(rawType) ? rawType : next.contentType,
          fiveDimensions: {
            completionPower: Math.round(dims.completion_rate_score ?? 0),
            interactionPotential: Math.round(dims.interaction_potential_score ?? 0),
            contentQuality: Math.round(dims.content_quality_score ?? 0),
            platformFit: Math.round(dims.platform_adaptation_score ?? 0),
            spreadPotential: Math.round(dims.spread_potential_score ?? 0),
          },
          compositeScore: Math.round(dims.comprehensive_score ?? 0),
          ratingLevel: level,
          sceneDescription: dims.screen_description ?? next.sceneDescription,
          hookAnalysis: dims.hook_analysis ?? next.hookAnalysis,
          bgm: dims.bgm_suggestion ?? next.bgm,
          tags: Array.from(new Set([...next.tags, ...tags])),
          disassemblyStatus: 'completed',
        };
      }
      return next;
    });

    setAiLoading(false);
    if (realInfo && analysisOk) {
      toast.success('自动解析完成：真实互动数据 + AI 内容分析已全部填充');
    } else if (realInfo && !analysisOk) {
      toast.warning(`真实视频数据已获取，但${aiError || 'AI 内容拆解失败'}`);
    } else if (!realInfo && analysisOk && hasUrl) {
      toast.error(`${errorMsg || '抖音视频数据获取失败'}；AI 内容拆解已完成，五维评分等为 AI 分析结果，互动数据请手动补充`, { duration: 6000 });
    } else if (!realInfo && analysisOk && !hasUrl) {
      toast.warning('已识别为抖音口令格式：AI 内容拆解已完成（基于口令文本推断），但无法自动获取真实互动数据，请粘贴标准链接重试或手动填写', { duration: 6000 });
    } else {
      toast.error(`${errorMsg || '自动解析失败'}；${aiError || '请稍后重试'}`, { duration: 5000 });
    }
  }, [form.videoScript]);

  function handleLinkChange(value: string) {
    // 链接清洗：从粘贴文本中正则提取纯抖音链接
    const { cleanUrl, method } = extractDouyinUrlDetail(value);
    const keywords = extractDouyinKeywords(value);

    // 🔴 自动清洗输入框显示：如果识别到标准短链/长链，将输入框内容替换为纯URL
    // （口令格式不替换，因为用户可能还在编辑；标准URL替换后更干净，且不影响关键词提取）
    if (cleanUrl && (method === 'standard-short' || method === 'standard-long' || method === 'standard-ies') && value !== cleanUrl) {
      set('douyinLink', cleanUrl);
    } else {
      set('douyinLink', value);
    }

    // 既没有 URL 也没有任何有效关键词 → 不触发解析
    if (!cleanUrl && !keywords) return;
    // 相同清洗后链接不重复触发解析（用户编辑中文尾巴时不会反复请求）
    const dedupKey = cleanUrl || `__kouling__${keywords.slice(0, 50)}`;
    if (dedupKey === lastCleanUrlRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (dedupKey === lastCleanUrlRef.current) return;
      lastCleanUrlRef.current = dedupKey;
      lastAutoLinkRef.current = value.trim();
      autoRunSeqRef.current += 1;
      // 解析用原始文本（保留关键词提取能力），而输入框显示已被清洗为纯URL
      void runFullAnalysis(value.trim(), autoRunSeqRef.current);
    }, 600);
  }

  function set<K extends keyof MaterialFormState>(key: K, value: MaterialFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDim(key: keyof MaterialFormState['fiveDimensions'], value: number) {
    setForm((f) => ({ ...f, fiveDimensions: { ...f.fiveDimensions, [key]: value } }));
  }

  async function handleAiAnalysis() {
    const cleanUrl = extractDouyinUrl(form.douyinLink);
    if (!cleanUrl) {
      toast.error('未识别到有效的抖音链接，请粘贴正确的抖音视频链接');
      return;
    }
    // 手动点击时跳过防抖：直接发起一次新请求，并标记为最新序列
    lastCleanUrlRef.current = cleanUrl;
    lastAutoLinkRef.current = form.douyinLink.trim();
    autoRunSeqRef.current += 1;
    await runFullAnalysis(cleanUrl, autoRunSeqRef.current);
  }

  async function handleSave() {
    // 五项真实数据字段必填校验：标题/作者非空，点赞/评论/分享必须为正数（真实互动数据不可能全为 0）
    if (!form.videoTitle.trim()) {
      toast.error('请输入视频标题的真实数据');
      return;
    }
    if (!form.author.trim()) {
      toast.error('请输入作者的真实数据');
      return;
    }
    if (!(Number(form.likes) > 0)) {
      toast.error('请输入真实的点赞数（不能为空或 0）');
      return;
    }
    if (!(Number(form.comments) > 0)) {
      toast.error('请输入真实的评论数（不能为空或 0）');
      return;
    }
    if (!(Number(form.shares) > 0)) {
      toast.error('请输入真实的分享数（不能为空或 0）');
      return;
    }
    setSaving(true);
    const payload: MaterialInput = {
      videoTitle: form.videoTitle.trim(),
      douyinLink: form.douyinLink.trim(),
      author: form.author.trim(),
      likes: Number(form.likes) || 0,
      comments: Number(form.comments) || 0,
      shares: Number(form.shares) || 0,
      completionRate: Number(form.fiveDimensions.completionPower) || 0,
      fiveDimensions: {
        completionPower: Number(form.fiveDimensions.completionPower) || 0,
        interactionPotential: Number(form.fiveDimensions.interactionPotential) || 0,
        contentQuality: Number(form.fiveDimensions.contentQuality) || 0,
        platformFit: Number(form.fiveDimensions.platformFit) || 0,
        spreadPotential: Number(form.fiveDimensions.spreadPotential) || 0,
      },
      compositeScore: Number(form.compositeScore) || 0,
      ratingLevel: form.ratingLevel,
      contentType: form.contentType,
      disassemblyStatus: form.disassemblyStatus,
      videoScript: form.videoScript.trim(),
      sceneDescription: form.sceneDescription.trim(),
      hookAnalysis: form.hookAnalysis.trim(),
      bgm: form.bgm.trim(),
      tags: form.tags,
    };
    // 先写入多维表格，成功后才更新 UI / 关闭弹窗；失败保留表单数据供重试
    try {
      if (editing) {
        await updateMaterial(editing.id, payload);
        toast.success('素材已更新');
      } else {
        await addMaterial(payload);
        toast.success('素材拆解已保存');
      }
      onOpenChange(false);
    } catch (error) {
      logger.error('material save failed:', String(error));
      toast.error(persistErrorText(error, '素材保存失败，表单已保留'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-2xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">{editing ? '编辑拆解素材' : '新建拆解素材'}</DialogTitle>
        </DialogHeader>

        <div className="mb-4 flex items-start gap-3 border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[#0033A0]" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-700">AI 全自动拆解</div>
            <div className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-400">粘贴抖音链接或分享口令后自动解析：先经服务端解析代理获取真实标题、作者与点赞/评论/分享数据，再由 AI 拆解五维评分、画面描述、钩子分析等內容字段；解析失败自动重试备用端点并提示，AI 绝不估算互动数据；口令格式无法获取真实数据时会自动做 AI 内容分析</div>
          </div>
          <Button type="button" size="sm" onClick={handleAiAnalysis} disabled={aiLoading || !form.douyinLink.trim()} className="shrink-0 rounded-none">
            {aiLoading && <Loader2 className="size-3.5 animate-spin" />}
            {aiLoading ? '自动解析中…' : '重新解析'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">视频标题（自动解析填充，可手动修改）</Label>
            <Input value={form.videoTitle} onChange={(e) => set('videoTitle', e.target.value)} placeholder="自动解析填充，失败可手动输入" className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">作者（自动解析填充，可手动修改）</Label>
            <Input value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="自动解析填充，失败可手动输入" className="rounded-none" />
          </div>
          <div className="md:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">抖音链接 <span className="text-[#0033A0]">· 粘贴后自动解析</span></Label>
              {parseStatus === 'parsing' && (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0033A0]">
                  <Loader2 className="size-3 animate-spin" /> 正在解析视频数据…
                </span>
              )}
              {parseStatus === 'success' && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">✓ 解析成功</span>
              )}
              {parseStatus === 'failed' && (
                <span className="text-[10px] font-semibold text-rose-500">解析失败</span>
              )}
            </div>
            <div className="relative">
              <Input value={form.douyinLink} onChange={(e) => handleLinkChange(e.target.value)} placeholder="粘贴抖音分享链接或口令，自动识别并解析，支持带中文分享语" className="rounded-none pr-10" />
              {parseStatus === 'parsing' && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#0033A0]" />}
            </div>

            {/* 可信度标记 & 调试面板入口 */}
            {(parseStatus === 'success' || parseStatus === 'failed') && (urlExtract || parseDebug) && (
              <div className="mt-2 space-y-2">
                {/* 可信度提示 */}
                {parseConfidence === 'low' && (
                  <div className="flex items-start gap-2 rounded-none border border-amber-200 bg-amber-50 px-2.5 py-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-amber-700">数据不完整：第三方API未返回完整互动数据</div>
                      <div className="mt-0.5 text-[10px] font-medium leading-relaxed text-amber-600">
                        当前数据来自第三方解析 API，点赞/分享数可能不准确（like_count 实际可能是收藏数，share_count 常为 0）。
                        请在下方 <span className="font-bold">点赞数 / 分享数</span> 输入框中手动补充，或点击「查看调试信息」排查抖音直爬失败原因后重试。
                      </div>
                    </div>
                  </div>
                )}
                {parseConfidence === 'high' && (
                  <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    <span>数据来源：抖音官方页面 statistics 字段，可信度高</span>
                  </div>
                )}
                {parseConfidence === 'mid' && (
                  <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                    <Info className="size-3.5" />
                    <span>数据来源：第三方解析 API，已做智能校准</span>
                  </div>
                )}

                {/* 调试面板展开/收起按钮 */}
                <button
                  type="button"
                  onClick={() => setDebugOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-none border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Terminal className="size-3" />
                    调试信息
                    {parseDebug && (
                      <span className="text-slate-400">
                        （{parseDebug.endpointResults.filter((r) => r.status === 'success').length}/{parseDebug.endpointResults.length} 链路成功）
                      </span>
                    )}
                    {!parseDebug && failedEndpointResults.length > 0 && (
                      <span className="text-rose-400">
                        （{failedEndpointResults.length} 链路全部失败）
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`size-3 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 调试面板内容 */}
                {debugOpen && (
                  <div className="rounded-none border border-slate-200 bg-slate-900 text-slate-200">
                    <div className="space-y-2 p-3">
                      {/* 链接提取信息 */}
                      {urlExtract && (
                        <div>
                          <div className="mb-1 text-[10px] font-bold text-slate-400">链接提取</div>
                          <div className="space-y-1 rounded-sm bg-slate-800 px-2 py-1.5 text-[10px]">
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-slate-500">解析方式</span>
                              <span className="flex-1 text-emerald-400 font-mono">
                                {urlExtract.method === 'standard-short' && '标准短链 (v.douyin.com)'}
                                {urlExtract.method === 'standard-long' && '标准长链 (www.douyin.com/video)'}
                                {urlExtract.method === 'standard-ies' && '分享链 (iesdouyin.com)'}
                                {urlExtract.method === 'kouling-token' && '抖音口令 (口令短码)'}
                                {urlExtract.method === 'kouling-fallback' && '抖音口令 (兜底匹配)'}
                                {urlExtract.method === 'none' && '未识别到有效链接 ⚠️'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-slate-500">提取的URL</span>
                              <span className="flex-1 break-all font-mono text-sky-300">
                                {urlExtract.cleanUrl || '(无)'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-slate-500">原始输入</span>
                              <span className="flex-1 break-all text-slate-400" title={urlExtract.rawInputPreview}>
                                {urlExtract.rawInputPreview || '(无)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 各链路状态 */}
                        <div>
                          <div className="mb-1 text-[10px] font-bold text-slate-400">解析链路状态</div>
                          <div className="space-y-1">
                            {(parseDebug?.endpointResults ?? failedEndpointResults).map((r, i) => (
                            <div key={i} className="rounded-sm bg-slate-800 px-2 py-1 text-[10px]">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {r.status === 'success' ? (
                                    <CheckCircle2 className="size-3 shrink-0 text-emerald-400" />
                                  ) : (
                                    <XCircle className="size-3 shrink-0 text-rose-400" />
                                  )}
                                  <span className="truncate">{r.label}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-slate-500">{r.durationMs}ms</span>
                                  {r.status === 'failed' && r.errorType && (
                                    <span className="text-rose-400">{r.errorType}</span>
                                  )}
                                </div>
                              </div>
                              {/* 失败时展开显示详细错误信息 */}
                              {r.status === 'failed' && r.errorDetail && (
                                <div className="mt-1 rounded-sm bg-slate-900/60 px-2 py-1 text-[9px] text-rose-300/90 leading-relaxed break-all">
                                  {r.errorDetail}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 字段路径映射 */}
                      <div>
                        <div className="mb-1 text-[10px] font-bold text-slate-400">字段路径映射</div>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          {(['videoTitle', 'author', 'likes', 'comments', 'shares', 'collects'] as const).map((field) => (
                            <div key={field} className="flex items-center justify-between gap-2 rounded-sm bg-slate-800 px-2 py-1">
                              <span className="text-slate-400">{field}</span>
                              <span className="truncate text-emerald-400" title={parseDebug?.fieldPaths[field] || '(未找到)'}>
                                {parseDebug?.fieldPaths[field] || '(未找到)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 全量数值字段（智能推断依据） */}
                      {parseDebug?.allNumericFields && parseDebug.allNumericFields.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400">全量数值字段（智能推断依据）</span>
                            <span className="text-[9px] text-slate-500">共 {parseDebug.allNumericFields.length} 个</span>
                          </div>
                          <div className="max-h-32 overflow-auto rounded-sm bg-slate-800">
                            <table className="w-full text-[9px] font-mono">
                              <thead className="sticky top-0 bg-slate-700 text-slate-300">
                                <tr>
                                  <th className="px-2 py-1 text-left font-medium">序号</th>
                                  <th className="px-2 py-1 text-left font-medium">字段路径</th>
                                  <th className="px-2 py-1 text-right font-medium">值</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parseDebug.allNumericFields
                                  .slice()
                                  .sort((a, b) => b.value - a.value)
                                  .map((f, i) => (
                                    <tr key={f.path} className="border-t border-slate-700/50">
                                      <td className="px-2 py-0.5 text-slate-500">{i + 1}</td>
                                      <td className="px-2 py-0.5 text-slate-300 break-all">{f.path}</td>
                                      <td className="px-2 py-0.5 text-right tabular-nums text-emerald-400">
                                        {f.value.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-1 text-[9px] text-slate-500 leading-relaxed">
                            💡 智能校准基于数值大小推断：最大值优先判为点赞，最小值判为评论。点赞=最大候选值，评论=最小候选值。
                          </div>
                        </div>
                      )}

                      {/* 校准说明 */}
                      {parseDebug?.calibrationReason && (
                        <div>
                          <div className="mb-1 text-[10px] font-bold text-slate-400">校准说明</div>
                          <div className="rounded-sm bg-slate-800 px-2 py-1 text-[10px] text-amber-300 leading-relaxed">
                            {parseDebug.calibrationReason}
                          </div>
                        </div>
                      )}

                      {/* 原始 JSON */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">原始 JSON 响应</span>
                          <span className="text-[9px] text-slate-500">
                            {parseDebug?.rawJson?.length || 0} 字符
                          </span>
                        </div>
                        <div className="max-h-40 overflow-auto rounded-sm bg-slate-800 p-2">
                          <pre className="font-mono text-[9px] leading-relaxed text-slate-300 whitespace-pre-wrap break-all">
                             {parseDebug?.rawJson || '(无)'}
                           </pre>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             )}

            {/* 解析失败时也展示调试入口 */}
            {parseStatus === 'failed' && parseError && (
              <div className="mt-1.5 space-y-1.5">
                <div className="rounded-none border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-medium leading-relaxed text-rose-600">
                  {parseError}。可点击右上角「重新解析」按钮重试，或手动填写标题/作者/互动数据；若粘贴的是抖音口令，请补全标准链接以获取真实互动数据
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">视频文案（可选，辅助 AI 拆解更准）</Label>
            <Textarea value={form.videoScript} onChange={(e) => set('videoScript', e.target.value)} placeholder="可粘贴视频口播文案或字幕全文，不填则 AI 基于链接自动推断" className="min-h-20 rounded-none" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">点赞数（自动解析填充，可手动修改）</Label>
              <div className="flex items-center gap-2">
                {parseConfidence === 'low' && form.likes > 0 && (
                  <span className="text-[9px] font-semibold text-amber-600">待核对 · 可能是收藏数</span>
                )}
                {parseStatus !== 'success' && form.likes === 0 && aiOk && (
                  <span className="text-[9px] font-semibold text-amber-600">AI 估算 · 非真实</span>
                )}
                {parseStatus === 'success' && form.likes > 0 && parseConfidence === 'high' && (
                  <span className="text-[9px] font-semibold text-emerald-600">真实数据</span>
                )}
                {parseStatus === 'success' && form.likes > 0 && parseConfidence === 'mid' && (
                  <span className="text-[9px] font-semibold text-slate-500">智能校准</span>
                )}
              </div>
            </div>
            <Input
              type="number"
              value={form.likes}
              onChange={(e) => set('likes', Number(e.target.value) || 0)}
              placeholder="自动解析填充，失败可手动输入"
              className={parseConfidence === 'low' ? 'rounded-none border-amber-400 focus-visible:ring-amber-400' : 'rounded-none'}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">评论数（自动解析填充，可手动修改）</Label>
              <div className="flex items-center gap-2">
                {parseStatus !== 'success' && form.comments === 0 && aiOk && (
                  <span className="text-[9px] font-semibold text-amber-600">AI 估算 · 非真实</span>
                )}
                {parseStatus === 'success' && form.comments > 0 && parseConfidence === 'high' && (
                  <span className="text-[9px] font-semibold text-emerald-600">真实数据</span>
                )}
                {parseStatus === 'success' && form.comments > 0 && parseConfidence !== 'high' && (
                  <span className="text-[9px] font-semibold text-slate-500">智能校准</span>
                )}
              </div>
            </div>
            <Input type="number" value={form.comments} onChange={(e) => set('comments', Number(e.target.value) || 0)} placeholder="自动解析填充，失败可手动输入" className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">分享数（自动解析填充，可手动修改）</Label>
              <div className="flex items-center gap-2">
                {parseConfidence === 'low' && (
                  <span className="text-[9px] font-semibold text-amber-600">待核对 · 第三方API常返回0</span>
                )}
                {parseStatus !== 'success' && form.shares === 0 && aiOk && (
                  <span className="text-[9px] font-semibold text-amber-600">AI 估算 · 非真实</span>
                )}
                {parseStatus === 'success' && form.shares > 0 && parseConfidence === 'high' && (
                  <span className="text-[9px] font-semibold text-emerald-600">真实数据</span>
                )}
                {parseStatus === 'success' && form.shares > 0 && parseConfidence === 'mid' && (
                  <span className="text-[9px] font-semibold text-slate-500">智能校准</span>
                )}
              </div>
            </div>
            <Input
              type="number"
              value={form.shares}
              onChange={(e) => set('shares', Number(e.target.value) || 0)}
              placeholder="自动解析填充，失败可手动输入"
              className={parseConfidence === 'low' ? 'rounded-none border-amber-400 focus-visible:ring-amber-400' : 'rounded-none'}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">内容类型（AI 自动判断，可修正）</Label>
            <Select value={form.contentType} onValueChange={(v) => set('contentType', v)}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">拆解状态</Label>
            <Select value={form.disassemblyStatus} onValueChange={(v) => set('disassemblyStatus', v as IMaterial['disassemblyStatus'])}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {Object.entries(DISASSEMBLY_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="mb-1 text-[9px] font-black uppercase tracking-tight text-slate-400">五维评分（0-100）</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {DIMENSION_LABELS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500">{label}</Label>
                  <Input type="number" value={form.fiveDimensions[key]} onChange={(e) => setDim(key, Number(e.target.value) || 0)} className="rounded-none" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">综合评分</Label>
            <Input type="number" value={form.compositeScore} onChange={(e) => set('compositeScore', Number(e.target.value) || 0)} className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">评分等级</Label>
            <Select value={form.ratingLevel} onValueChange={(v) => set('ratingLevel', v as IMaterial['ratingLevel'])}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {RATING_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}级</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">画面描述</Label>
            <Textarea value={form.sceneDescription} onChange={(e) => set('sceneDescription', e.target.value)} className="min-h-16 rounded-none" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">钩子分析</Label>
            <Textarea value={form.hookAnalysis} onChange={(e) => set('hookAnalysis', e.target.value)} className="min-h-16 rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">BGM</Label>
            <Input value={form.bgm} onChange={(e) => set('bgm', e.target.value)} placeholder="如轻快电子鼓点" className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">情绪标签（AI 自动填充，可增减）</Label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...MATERIAL_TAG_OPTIONS, ...form.tags])).map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => set('tags', active ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])}
                    className={`rounded-none border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      active ? 'border-[#0033A0] bg-[#0033A0] text-white' : 'border-[#E2E8F0] bg-white text-slate-500 hover:border-[#0033A0]/40 hover:text-[#0033A0]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">取消</Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="rounded-none">{saving ? '保存中…' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-[9px] font-black uppercase tracking-tight text-slate-400">{title}</div>
      <div className="space-y-1.5">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
            <span className="text-[11px] font-medium text-slate-600">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function MaterialLibraryPage() {
  const { materials } = useWorkshop();
  const [keyword, setKeyword] = useState('');
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IMaterial | null>(null);

  const allTags = useMemo(() => Array.from(new Set(materials.flatMap((m) => m.tags))), [materials]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const kw = keyword.trim();
      const matchKeyword = !kw || m.videoTitle.includes(kw) || m.author.includes(kw);
      const matchType = contentTypes.length === 0 || contentTypes.includes(m.contentType);
      const matchLevel = levels.length === 0 || levels.includes(m.ratingLevel);
      const matchStatus = statuses.length === 0 || statuses.includes(m.disassemblyStatus);
      const matchTag = tagFilter.length === 0 || m.tags.some((t) => tagFilter.includes(t));
      return matchKeyword && matchType && matchLevel && matchStatus && matchTag;
    });
  }, [materials, keyword, contentTypes, levels, statuses, tagFilter]);

  return (
    <div className="space-y-6">
      <SectionHeader number="01" title="爆款素材库" subtitle="Douyin viral video disassembly & management" />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 页面级筛选面板（非应用导航） */}
        <ReportCard className="h-fit w-full shrink-0 p-4 lg:w-56">
          <FilterGroup title="内容类型 / TYPE" options={CONTENT_TYPES} selected={contentTypes} onToggle={(v) => toggle(contentTypes, setContentTypes, v)} />
          <div className="my-4 h-[1px] bg-[#E2E8F0]" />
          <FilterGroup title="评分等级 / LEVEL" options={RATING_LEVELS} selected={levels} onToggle={(v) => toggle(levels, setLevels, v)} />
          <div className="my-4 h-[1px] bg-[#E2E8F0]" />
          <FilterGroup title="拆解状态 / STATUS" options={Object.values(DISASSEMBLY_STATUS_LABELS)} selected={statuses} onToggle={(v) => toggle(statuses, setStatuses, v)} />
          {allTags.length > 0 && (
            <>
              <div className="my-4 h-[1px] bg-[#E2E8F0]" />
              <FilterGroup title="标签 / TAGS" options={allTags.slice(0, 8)} selected={tagFilter} onToggle={(v) => toggle(tagFilter, setTagFilter, v)} />
            </>
          )}
        </ReportCard>

        {/* 素材表格 */}
        <ReportCard className="min-w-0 flex-1 p-0">
          <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">素材列表</span>
              <span className="text-[10px] font-bold tabular-nums text-slate-400">{filtered.length}/{materials.length}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索标题 / 作者" className="rounded-none bg-white pl-9" />
              </div>
              <Button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="rounded-none"
              >
                <Sparkles className="size-4" />
                新建拆解
              </Button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
                  <TableHead className="whitespace-nowrap py-2 text-[9px] font-black uppercase text-slate-400">视频标题</TableHead>
                  <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">作者</TableHead>
                  <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">内容类型</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">点赞</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">评论</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">分享</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">完播力</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">综合评分</TableHead>
                  <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">等级</TableHead>
                  <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">拆解状态</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-12 text-center text-[11px] font-medium text-slate-400">暂无匹配素材，调整筛选或新建拆解</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id} className="border-b border-[#E2E8F0] transition-colors hover:bg-slate-50">
                      <TableCell className="max-w-[220px] py-2.5">
                        <Link to={`/materials/${m.id}`} className="flex items-center gap-1 text-xs font-bold text-[#0033A0] hover:underline">
                          <span className="truncate">{m.videoTitle}</span>
                          <ExternalLink className="size-3 shrink-0 opacity-50" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-[11px] font-medium text-slate-600">{m.author}</TableCell>
                      <TableCell className="text-[11px] font-medium text-slate-600">{m.contentType}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-500">{fmtCount(m.likes)}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-500">{fmtCount(m.comments)}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-500">{fmtCount(m.shares)}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-500">{m.completionRate}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-800">{m.compositeScore}</TableCell>
                      <TableCell><RatingLevelBadge level={m.ratingLevel} /></TableCell>
                      <TableCell><MaterialStatusBadge status={m.disassemblyStatus} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="size-7 rounded-none">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-none">
                            <DropdownMenuItem onClick={() => {
                              setEditing(m);
                              setDialogOpen(true);
                            }}>
                              <Pencil className="size-3.5" /> 编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/materials/${m.id}`}>查看详情</Link>
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
      </div>

      <MaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
