import { useEffect, useRef, useState } from 'react';
import { Bot, RefreshCw, Send } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Spinner } from '@client/src/components/ui/spinner';
import { matchFaq } from './consultation.api';
import type { FaqAnswerSource, FaqListItem } from '@shared/consultation';

interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  references?: string[];
  hint?: string;
  error?: boolean;
  retryText?: string;
}

const GREETING_MESSAGE =
  '您好，我是飘飘香智能咨询助手。您可以咨询课程、学费、开班时间等问题，我会从知识库中为您匹配标准答案。';

const createMessageId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ConsultationChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: createMessageId(), role: 'system', content: GREETING_MESSAGE },
  ]);
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container: HTMLDivElement | null = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, sending]);

  const sendQuestion = async (text: string) => {
    if (!text || sending) return;
    setSending(true);
    setMessages((prev: ChatMessage[]) => [
      ...prev,
      { id: createMessageId(), role: 'user', content: text },
    ]);
    try {
      const result = await matchFaq(text);
      const references: string[] = (result.relatedFaqs ?? [])
        .map((faq: FaqListItem) => faq.question)
        .filter((item: string) => !!item);
      const source: FaqAnswerSource =
        result.answerSource ??
        (result.matched ? 'direct' : result.offTopic ? 'offTopic' : 'generated');
      const generatedContent: string =
        result.answer ??
        result.fallbackMessage ??
        '抱歉，暂未找到匹配的答案。';
      const reply: ChatMessage =
        source === 'direct'
          ? {
              id: createMessageId(),
              role: 'system',
              content: result.answer ?? '',
            }
          : source === 'generated'
            ? {
                id: createMessageId(),
                role: 'system',
                content: generatedContent,
                references,
                hint: '知识库中没有完全匹配的答案，以上回复由 AI 结合最接近的知识库内容生成，如需更准确的信息可联系招生老师。该问题已记入待补充列表。',
              }
            : {
                id: createMessageId(),
                role: 'system',
                content: generatedContent,
                references: [],
              };
      setMessages((prev: ChatMessage[]) => [...prev, reply]);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : '咨询失败，请稍后重试';
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'system',
          content: message,
          error: true,
          retryText: text,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text: string = input.trim();
    if (!text || sending) return;
    setInput('');
    void sendQuestion(text);
  };

  return (
    <Card className="flex h-[560px] flex-col">
      <CardHeader className="flex-row items-center gap-2 border-b pb-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Bot className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold">智能咨询</h2>
          <p className="text-xs text-muted-foreground">
            输入问题，自动匹配知识库标准答案
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden pt-4">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((message: ChatMessage) => (
            <div
              key={message.id}
              className={
                message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground break-words'
                    : 'max-w-[85%] rounded-lg border bg-card px-3 py-2 text-sm break-words'
                }
              >
                {message.content}
                {message.references && message.references.length > 0 ? (
                  <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                    参考来源：
                    {message.references.map((item: string, index: number) => (
                      <div key={item}>
                        {index + 1}. {item}
                      </div>
                    ))}
                  </div>
                ) : null}
                {message.hint ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {message.hint}
                  </div>
                ) : null}
                {message.error ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1"
                    disabled={sending}
                    onClick={() => void sendQuestion(message.retryText ?? '')}
                    data-ai-section-type="button"
                  >
                    <RefreshCw className="size-3" />
                    重试
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                正在为您匹配知识库…
              </div>
            </div>
          ) : null}
        </div>
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={input}
            placeholder="请输入您想咨询的问题"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            data-ai-section-type="button"
          >
            {sending ? (
              <Spinner className="size-4" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsultationChatPanel;
