import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Card, CardContent } from '@client/src/components/ui/card';
import { aiTools } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { NaturalLanguageQueryResponse } from '@shared/api.interface';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  response?: NaturalLanguageQueryResponse;
  timestamp: number;
}

const EXAMPLE_TAGS: string[] = [
  '库存低于10的商品',
  '各仓库库存分布',
  '库存金额最高的商品',
  '电子产品库存情况',
  '今日入库了多少',
  '需要补货的商品',
  '总库存金额是多少',
  '近7天出入库趋势',
  '有多少个商品SKU',
];

const HISTORY_KEY = 'nl-query-history';
const MAX_HISTORY = 20;

const NaturalLanguageTab: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载历史记录
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const history = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(history)) setMessages(history.slice(0, MAX_HISTORY * 2));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 保存历史记录
  const saveHistory = useCallback((msgs: ChatMessage[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY * 2)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (inputQuery?: string) => {
    const q = (inputQuery ?? query).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setQuery('');
    setLoading(true);

    try {
      const res = await aiTools.queryNaturalLanguage(q);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: res.summary ?? '',
        response: res,
        timestamp: Date.now(),
      };
      const finalMessages = [...nextMessages, aiMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } catch (err: unknown) {
      logger.error('NL query failed', { error: String(err) });
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '抱歉，查询失败，请稍后重试',
        timestamp: Date.now(),
      };
      const finalMessages = [...nextMessages, aiMsg];
      setMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderAiContent = (msg: ChatMessage): React.ReactNode => {
    if (!msg.response) {
      return <p className="text-sm">{msg.content}</p>;
    }
    const res = msg.response;
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium">{res.title}</div>
        <div className="text-sm text-muted-foreground">{res.summary}</div>
        {res.resultType === 'table' && res.tableData && res.tableData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border border-border bg-muted/30">
                  {(res.columns ?? []).length > 0
                    ? res.columns?.map((col) => (
                        <th
                          key={col.key}
                          className="text-left px-3 py-2 font-medium border border-border"
                        >
                          {col.label}
                        </th>
                      ))
                    : Object.keys(res.tableData[0] ?? {}).map((key) => (
                        <th
                          key={key}
                          className="text-left px-3 py-2 font-medium border border-border"
                        >
                          {key}
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {res.tableData.map((row: Record<string, unknown>, idx: number) => (
                  <tr key={idx} className="border border-border">
                    {(res.columns ?? []).length > 0
                      ? res.columns?.map((col) => (
                          <td
                            key={col.key}
                            className="px-3 py-2 border border-border font-mono text-xs"
                          >
                            {String(row[col.key] ?? '')}
                          </td>
                        ))
                      : Object.values(row).map((val, i) => (
                          <td
                            key={i}
                            className="px-3 py-2 border border-border font-mono text-xs"
                          >
                            {String(val ?? '')}
                          </td>
                        ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {res.resultType === 'chart' && res.chartData && (
          <ChartRenderer data={res.chartData} resultType={res.queryType} />
        )}
        {res.resultType === 'kpi' && res.kpiData && res.kpiData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {res.kpiData.map((kpi, idx: number) => (
              <Card
                key={idx}
                className="rounded-sm shadow-none border border-border"
              >
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {kpi.label}
                  </div>
                  <div className="text-xl font-mono font-light text-primary">
                    {kpi.value}
                    {kpi.unit && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {kpi.unit}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      <Card className="rounded-sm shadow-none border border-border flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                <Sparkles className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                AI 智能查询
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                用自然语言描述你想查询的库存数据，AI 会自动理解并以最合适的形式展示结果
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {EXAMPLE_TAGS.map((tag: string) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSubmit(tag)}
                    className="px-3 py-1.5 text-xs rounded-sm border border-primary/30 text-primary bg-accent hover:bg-accent/70 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-primary'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] ${
                  msg.role === 'user' ? 'text-right' : ''
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="inline-block px-3 py-2 bg-primary text-primary-foreground rounded-sm text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="inline-block px-3 py-3 bg-card border border-border rounded-sm text-left">
                    {renderAiContent(msg)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 bg-accent text-primary">
                <Bot className="size-4" />
              </div>
              <div className="inline-block px-3 py-3 bg-card border border-border rounded-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <span className="text-xs text-muted-foreground ml-2">思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* 输入区 */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题，例如：库存低于10的商品、各仓库库存分布、电子产品库存情况..."
              className="rounded-sm h-10"
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || loading}
              className="h-10"
            >
              <Send className="size-4" />
              <span className="ml-1">发送</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// 图表渲染子组件
interface ChartRendererProps {
  data: { categories: string[]; series: { name: string; data: number[] }[] };
  resultType: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 0,
      data: data.series.map((s) => s.name),
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      boundaryGap: true,
    },
    yAxis: { type: 'value' },
    series: data.series.map((s, idx: number) => ({
      name: s.name,
      type: 'bar' as const,
      data: s.data,
      itemStyle: {
        color: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9'][idx % 5],
      },
      barWidth: `${60 / Math.max(data.series.length, 1)}%`,
    })),
  };

  return (
    <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
  );
};

export default NaturalLanguageTab;
