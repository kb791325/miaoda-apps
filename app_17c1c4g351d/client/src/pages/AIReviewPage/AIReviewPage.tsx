import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { capabilityClient, scopedStorage } from '@lark-apaas/client-toolkit';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MOCK_DASHBOARD_SUMMARY,
  MOCK_CHANNEL_GMV,
  MOCK_ALERTS,
} from '@/data/dashboard';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  FileText,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';

// 插件实例 ID
const REVIEW_PLUGIN_ID = 'ai_review_report_generator_1';
const DIAGNOSIS_PLUGIN_ID = 'ai_diagnosis_generator_1';
const CHAT_PLUGIN_ID = 'ecommerce_business_qa_assistant_1';

// 本地存储 key
const STORAGE_KEY = '__app_ecom_review_history';

interface IReviewReport {
  id: string;
  date: string;
  type: 'daily' | 'weekly';
  summary: string;
  fullContent: string;
  createdAt: string;
}

interface IDiagnosisItem {
  id: string;
  title: string;
  desc: string;
  suggestion: string;
  icon: 'conversion' | 'inventory' | 'roi' | 'refund';
  level: 'warning' | 'danger' | 'info';
}

interface IChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isLoading?: boolean;
}

// 默认诊断（加载时展示 mock，AI 生成后替换）
const DEFAULT_DIAGNOSIS: IDiagnosisItem[] = [
  {
    id: '1',
    title: '转化率下降',
    desc: '移动端转化率环比下降 8%，主要来自商品详情页跳出率上升',
    suggestion: '建议检查详情页加载速度和首屏内容，优化主图视频',
    icon: 'conversion',
    level: 'warning',
  },
  {
    id: '2',
    title: '库存预警',
    desc: 'A款连衣裙库存仅剩 3 天，当前日均销量 28 件呈上升趋势',
    suggestion: '建议立即补货 400 件，同时设置预售标签',
    icon: 'inventory',
    level: 'danger',
  },
  {
    id: '3',
    title: '投放 ROI 偏低',
    desc: '直通车 ROI 跌至 1.8，低于盈亏平衡线 2.0',
    suggestion: '建议降低出价 15%，优化关键词，重点投放高转化词',
    icon: 'roi',
    level: 'warning',
  },
  {
    id: '4',
    title: '退款率超标',
    desc: '退款率连续 3 天高于 5% 警戒线，质量问题占比上升',
    suggestion: '建议排查纯棉T恤供应链，加强品控检验',
    icon: 'refund',
    level: 'danger',
  },
  {
    id: '5',
    title: '复购率持续提升',
    desc: '复购率从 18.5% 提升至 31.2%，老客贡献占比增加',
    suggestion: '建议加大会员权益投入，推出老客专属活动',
    icon: 'conversion',
    level: 'info',
  },
];

const iconMap = {
  conversion: TrendingUp,
  inventory: Package,
  roi: DollarSign,
  refund: AlertTriangle,
};

const levelConfig = {
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconBg: 'bg-red-100 text-red-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  info: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
};

// 从本地存储加载历史复盘
function loadHistory(): IReviewReport[] {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 保存到本地存储
function saveHistory(reports: IReviewReport[]) {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // 忽略存储错误
  }
}

export default function AIReviewPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [reports, setReports] = useState<IReviewReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<IReviewReport | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [diagnosisContent, setDiagnosisContent] = useState('');
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(false);
  const diagnosisTriggeredRef = useRef(false);

  const [chatMessages, setChatMessages] = useState<IChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content:
        '你好！我是你的 **AI 经营助手** 👋\n\n我可以帮你分析经营数据、回答商品/流量/客户相关问题。试试看问我：\n\n- "上周哪个品利润最高？"\n- "退款率怎么样？"\n- "库存有什么问题？"',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 加载历史
  useEffect(() => {
    const history = loadHistory();
    setReports(history);
    if (history.length > 0) {
      setSelectedReport(history[0]);
    }
  }, []);

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const filteredReports = useMemo(
    () => reports.filter((r) => r.type === reportType),
    [reports, reportType]
  );

  // 构造经营数据摘要（用于传入 AI 复盘）
  const buildBusinessData = useCallback(() => {
    const s = MOCK_DASHBOARD_SUMMARY;
    const channels = MOCK_CHANNEL_GMV.map(
      (c) => `- ${c.name}: ¥${c.value.toLocaleString()} (${c.percentage}%)`
    ).join('\n');
    const alerts = MOCK_ALERTS.map(
      (a) => `- [${a.level === 'danger' ? '严重' : '警告'}] ${a.title}: ${a.desc}`
    ).join('\n');
    return `
## 今日核心指标
- GMV: ¥${s.gmv.toLocaleString()}（环比 ${s.gmvChange > 0 ? '+' : ''}${s.gmvChange}%）
- 订单量: ${s.orders}单（环比 ${s.ordersChange > 0 ? '+' : ''}${s.ordersChange}%）
- 客单价: ¥${s.avgOrderValue}（环比 ${s.avgOrderValueChange > 0 ? '+' : ''}${s.avgOrderValueChange}%）
- 转化率: ${s.conversionRate}%（环比 ${s.conversionRateChange > 0 ? '+' : ''}${s.conversionRateChange}%）
- 退款率: ${s.refundRate}%（环比 ${s.refundRateChange > 0 ? '+' : ''}${s.refundRateChange}%）
- 毛利率: ${s.grossMargin}%（环比 ${s.grossMarginChange > 0 ? '+' : ''}${s.grossMarginChange}%）

## 渠道 GMV 分布
${channels}

## 异常指标提醒
${alerts}
`.trim();
  }, []);

  // 构造异常指标数据（用于 AI 诊断）
  const buildAbnormalData = useCallback(() => {
    return MOCK_ALERTS.map(
      (a) => `- [${a.level === 'danger' ? '严重' : '警告'}][${a.category}] ${a.title}: ${a.desc}`
    ).join('\n');
  }, []);

  // 生成复盘报告
  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratedContent('');
    setSelectedReport(null);
    let fullContent = '';

    try {
      const businessData = buildBusinessData();
      const executor = (capabilityClient as any).load(REVIEW_PLUGIN_ID);
      const stream = (executor as any).callStream('textGenerate', {
        business_data: businessData,
      });

      for await (const chunk of stream) {
        const piece = chunk.content ?? chunk.response;
        if (piece) {
          fullContent += piece;
          setGeneratedContent(fullContent);
        }
      }

      // 生成完成后保存到历史
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const summary = fullContent.slice(0, 60).replace(/[#*>\-]/g, '').trim() + '...';
      const newReport: IReviewReport = {
        id: `report-${Date.now()}`,
        date: dateStr,
        type: 'daily',
        summary,
        fullContent,
        createdAt: new Date().toISOString(),
      };

      setReports((prev) => {
        const updated = [newReport, ...prev];
        saveHistory(updated);
        return updated;
      });
      setSelectedReport(newReport);
      toast.success('复盘报告生成完成');
    } catch (error) {
      toast.error('AI 复盘服务暂不可用，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成 AI 诊断
  const handleGenerateDiagnosis = async (silent = false) => {
    if (isDiagnosisLoading) return;
    setIsDiagnosisLoading(true);
    setDiagnosisContent('');

    try {
      const abnormalData = buildAbnormalData();
      const executor = (capabilityClient as any).load(DIAGNOSIS_PLUGIN_ID);
      const stream = (executor as any).callStream('textGenerate', {
        abnormal_indicators: abnormalData,
      });

      let full = '';
      for await (const chunk of stream) {
        const piece = chunk.content ?? chunk.response;
        if (piece) {
          full += piece;
          setDiagnosisContent(full);
        }
      }

      if (full) {
        toast.success('智能诊断生成完成');
      }
    } catch {
      setDiagnosisContent('');
      if (!silent) {
        toast.error('AI 诊断服务暂不可用，请稍后重试');
      }
    } finally {
      setIsDiagnosisLoading(false);
    }
  };

  // 进入页面自动生成诊断（仅首次挂载时触发，静默模式不弹错误提示）
  useEffect(() => {
    if (!diagnosisTriggeredRef.current) {
      diagnosisTriggeredRef.current = true;
      handleGenerateDiagnosis(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 发送对话消息
  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || isChatLoading) return;

    const userMsg: IChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };
    const aiMsg: IChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content: '',
      isLoading: true,
    };

    setChatMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputValue('');
    setIsChatLoading(true);

    try {
      // 构造对话历史
      const historyText = chatMessages
        .slice(-6)
        .map((m) => `${m.role === 'user' ? '商家' : '分析师'}: ${m.content}`)
        .join('\n');

      const executor = (capabilityClient as any).load(CHAT_PLUGIN_ID);
      const stream = (executor as any).callStream('textGenerate', {
        user_question: question,
        dialog_history: historyText,
      });

      let full = '';
      for await (const chunk of stream) {
        const piece = chunk.content ?? chunk.response;
        if (piece) {
          full += piece;
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsg.id ? { ...m, content: full, isLoading: false } : m
            )
          );
        }
      }

      // 确保 isLoading 关闭
      setChatMessages((prev) =>
        prev.map((m) => (m.id === aiMsg.id ? { ...m, isLoading: false } : m))
      );
    } catch (error) {
      toast.error('AI 助手暂不可用，请稍后重试');
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? { ...m, content: '抱歉，AI 服务暂时不可用，请稍后再试。', isLoading: false }
            : m
        )
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  const displayContent = selectedReport
    ? selectedReport.fullContent
    : generatedContent;

  const hasDiagnosisContent = diagnosisContent.length > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              AI 智能复盘助手
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI 自动生成经营复盘，智能诊断经营问题
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isGenerating ? '生成中...' : '生成今日复盘'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* 左侧：历史复盘列表 */}
        <Card className="border-border/60 shadow-sm lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              历史复盘
            </CardTitle>
            <Tabs
              defaultValue="daily"
              className="w-full mt-2"
              onValueChange={(v) => setReportType(v as 'daily' | 'weekly')}
            >
              <TabsList className="w-full h-8">
                <TabsTrigger value="daily" className="text-xs flex-1">
                  日报
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs flex-1">
                  周报
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 overflow-y-auto flex-1">
            {filteredReports.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  暂无{reportType === 'daily' ? '日报' : '周报'}记录
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  点击右上角按钮生成今日复盘
                </p>
              </div>
            ) : (
              filteredReports.map((report) => {
                const isActive = selectedReport?.id === report.id;
                return (
                  <button
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report);
                      setGeneratedContent('');
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/40 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isActive ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {report.date}
                      </span>
                      <Badge
                        variant={report.type === 'daily' ? 'secondary' : 'default'}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {report.type === 'daily' ? '日报' : '周报'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {report.summary}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(report.createdAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* 右侧：主内容区 */}
        <div className="lg:col-span-3 space-y-6 flex flex-col min-h-0">
          {/* 复盘报告卡片 */}
          <Card className="border-border/60 shadow-sm flex-1 flex flex-col min-h-[400px]">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {isGenerating && (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  )}
                  {selectedReport
                    ? `${selectedReport.date} 复盘报告`
                    : isGenerating
                      ? '今日复盘生成中...'
                      : '今日复盘报告'}
                </CardTitle>
                {selectedReport && (
                  <Badge variant="outline" className="text-xs">
                    {selectedReport.type === 'daily' ? '日报' : '周报'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 overflow-y-auto flex-1">
              {displayContent ? (
                <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {displayContent}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                  <p className="text-base font-medium text-foreground">
                    点击「生成今日复盘」
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    AI 将基于今日经营数据自动生成包含概况、亮点、问题和建议的复盘报告
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 智能诊断卡片 */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  <CardTitle className="text-base font-semibold">
                    智能诊断
                  </CardTitle>
                  {isDiagnosisLoading && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                  <Badge variant="secondary" className="text-xs ml-1">
                    {DEFAULT_DIAGNOSIS.length} 条结论
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateDiagnosis()}
                  disabled={isDiagnosisLoading}
                >
                  重新诊断
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                AI 自动检测经营异常，给出优化建议
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {hasDiagnosisContent ? (
                <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {diagnosisContent}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {DEFAULT_DIAGNOSIS.map((item) => {
                    const Icon = iconMap[item.icon];
                    const config = levelConfig[item.level];
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border ${config.bg} ${config.border}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`size-9 rounded-lg shrink-0 flex items-center justify-center ${config.iconBg}`}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-semibold ${config.text}`}>
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-xs text-foreground/70 mt-1 leading-relaxed">
                              {item.desc}
                            </p>
                            <div className="mt-2 pt-2 border-t border-current/10">
                              <p className="text-xs text-foreground/80 leading-relaxed">
                                💡 {item.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI 对话窗口 */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                AI 经营助手
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                有任何经营数据问题，直接问我
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 mb-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback
                        className={
                          msg.role === 'ai'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {msg.role === 'ai' ? (
                          <Bot className="size-4" />
                        ) : (
                          <User className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-foreground'
                      }`}
                    >
                      {msg.isLoading && !msg.content ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="试试问：上周哪个品利润最高？"
                  className="h-10"
                  disabled={isChatLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isChatLoading}
                  className="h-10 px-4"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
