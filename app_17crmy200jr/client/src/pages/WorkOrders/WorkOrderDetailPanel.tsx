import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Clock, User, Phone, Monitor, AlertTriangle, FileText,
  Paperclip, CheckCircle, Send, XCircle, Play, Loader2,
} from 'lucide-react';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@client/src/components/ui/sheet';
import { cn } from '@client/src/lib/utils';

import { getById, update, updateStatus } from '@client/src/api/work-orders';
import type { WorkOrderDetail as Detail, WorkOrderStatus, WorkOrderSatisfaction } from '@shared/api.interface';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: '待处理', processing: '处理中', waiting_confirm: '待确认',
  resolved: '已解决', closed: '已关闭',
};
const STATUS_STYLE: Record<WorkOrderStatus, string> = {
  pending: 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]',
  processing: 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]',
  waiting_confirm: 'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]',
  resolved: 'border-[hsl(142_60%_45%)] bg-[hsl(142_60%_95%)] text-[hsl(142_60%_30%)]',
  closed: 'border-border bg-muted text-muted-foreground',
};
const URGENCY_LABEL: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' };
const URGENCY_STYLE: Record<string, string> = {
  low: 'border-border bg-muted text-muted-foreground',
  medium: 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]',
  high: 'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]',
  urgent: 'border-[hsl(0_70%_55%)] bg-[hsl(0_70%_95%)] text-[hsl(0_70%_40%)]',
};
const PTYPE_LABEL: Record<string, string> = {
  hardware: '硬件故障', software: '软件问题', network: '网络问题',
  account: '账号问题', peripheral: '外设问题', other: '其他',
};
const SAT_OPTIONS: { value: WorkOrderSatisfaction; label: string }[] = [
  { value: 'satisfied', label: '满意' }, { value: 'neutral', label: '一般' }, { value: 'unsatisfied', label: '不满意' },
];
const FLOW: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  pending: ['processing', 'closed'], processing: ['waiting_confirm', 'closed'],
  waiting_confirm: ['resolved', 'closed'], resolved: ['closed'], closed: [],
};

interface Props { orderId: string | null; open: boolean; onClose: () => void; onUpdated: () => void; }

const InfoRow: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode; mono?: boolean }> = ({ icon: Icon, label, children, mono }) => (
  <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
    <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

const WorkOrderDetailPanel: React.FC<Props> = ({ orderId, open, onClose, onUpdated }) => {
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [solution, setSolution] = useState('');
  const [satisfaction, setSatisfaction] = useState<WorkOrderSatisfaction | ''>('');
  const [acting, setActing] = useState<string | null>(null);

  const fetch = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await getById(orderId);
      setD(data); setAssignee(data.assignee || ''); setSolution(data.solution || ''); setSatisfaction(data.satisfaction || '');
    } catch (e: unknown) { logger.error('获取详情失败', e); toast.error('加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open && orderId) fetch(); }, [open, orderId]); // eslint-disable-line

  const handleSave = async () => {
    if (!d) return; setSaving(true);
    try { await update(d.id, { solution, assignee: assignee || undefined }); toast.success('保存成功'); onUpdated(); fetch(); }
    catch (e: unknown) { logger.error('保存失败', e); toast.error('保存失败'); }
    finally { setSaving(false); }
  };

  const doAction = async (s: WorkOrderStatus) => {
    if (!d) return; setActing(s);
    try {
      await updateStatus(d.id, { status: s, satisfaction: s === 'resolved' && satisfaction ? satisfaction : undefined });
      toast.success(`状态已更新为「${STATUS_LABELS[s]}」`); onUpdated(); fetch();
    } catch (e: unknown) { logger.error('流转失败', e); toast.error('操作失败'); }
    finally { setActing(null); }
  };

  const fmt = (v: string) => v ? v.slice(0, 19).replace('T', ' ') : '-';
  const cs = d ? (d.status as WorkOrderStatus) : null;
  const actions = cs ? FLOW[cs] : [];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] rounded-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-base">{d?.orderNo || '...'}</span>
            {cs && <Badge className={cn('rounded-sm font-medium border px-2 py-0.5 text-xs', STATUS_STYLE[cs])} variant="outline">{STATUS_LABELS[cs]}</Badge>}
          </SheetTitle>
          <SheetDescription>工单详情</SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : d ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-sm border border-border bg-card">
              <div className="px-4 py-2 border-b border-border"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">基本信息</p></div>
              <div className="px-4 py-2">
                <InfoRow icon={User} label="报修人"><p className="text-sm text-foreground">{d.reporterDetail?.name || d.reporterName || d.reporter}</p></InfoRow>
                <InfoRow icon={Phone} label="联系电话"><p className="text-sm text-foreground">{d.contactPhone || '-'}</p></InfoRow>
                <InfoRow icon={Monitor} label="关联资产"><p className="text-sm text-foreground">{d.assetName ? `${d.assetName}${d.assetId ? ` (${d.assetId})` : ''}` : '-'}</p></InfoRow>
                <InfoRow icon={AlertTriangle} label="问题类型"><p className="text-sm text-foreground">{PTYPE_LABEL[d.problemType] || d.problemType}</p></InfoRow>
                <InfoRow icon={AlertTriangle} label="紧急程度"><Badge className={cn('rounded-sm font-medium border px-2 py-0.5 text-xs', URGENCY_STYLE[d.urgency] || '')} variant="outline">{URGENCY_LABEL[d.urgency] || d.urgency}</Badge></InfoRow>
                <InfoRow icon={FileText} label="问题描述"><p className="text-sm text-foreground break-words">{d.description}</p></InfoRow>
                <InfoRow icon={Paperclip} label="附件链接"><p className="text-sm text-foreground break-words font-mono">{d.attachmentUrls || '-'}</p></InfoRow>
                <InfoRow icon={Clock} label="创建时间"><p className="text-sm text-foreground font-mono">{fmt(d.createdAt)}</p></InfoRow>
              </div>
            </div>
            <div className="rounded-sm border border-border bg-card">
              <div className="px-4 py-2 border-b border-border"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">处理信息</p></div>
              <div className="p-4 space-y-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">处理人（用户ID）</label><Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="输入用户ID" className="rounded-sm" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">解决方案</label><Textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="填写解决方案..." className="min-h-[80px] rounded-sm" /></div>
                {d.status === 'resolved' && d.resolvedAt && <InfoRow icon={CheckCircle} label="解决时间"><p className="text-sm text-foreground font-mono">{fmt(d.resolvedAt)}</p></InfoRow>}
                {d.satisfaction && <InfoRow icon={CheckCircle} label="满意度"><p className="text-sm text-foreground">{SAT_OPTIONS.find(o => o.value === d.satisfaction)?.label || d.satisfaction}</p></InfoRow>}
                <InfoRow icon={Clock} label="最后更新"><p className="text-sm text-foreground font-mono">{fmt(d.updatedAt)}</p></InfoRow>
                <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">{saving ? <><Loader2 className="size-4 mr-2 animate-spin" />保存中...</> : '保存'}</Button>
              </div>
            </div>
            {actions.length > 0 && (
              <div className="rounded-sm border border-border bg-card">
                <div className="px-4 py-2 border-b border-border"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">状态操作</p></div>
                <div className="p-4 space-y-3">
                  {actions.includes('resolved') && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">满意度评价</label>
                      <Select value={satisfaction} onValueChange={(v) => setSatisfaction(v as WorkOrderSatisfaction)}>
                        <SelectTrigger className="rounded-sm"><SelectValue placeholder="请选择满意度" /></SelectTrigger>
                        <SelectContent>{SAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {actions.map(a => (
                      <Button key={a} variant={a === 'closed' ? 'outline' : 'default'} size="sm" disabled={acting === a} onClick={() => doAction(a)}>
                        {acting === a ? <Loader2 className="size-4 mr-2 animate-spin" /> : a === 'processing' ? <Play className="size-4 mr-2" /> : a === 'waiting_confirm' ? <Send className="size-4 mr-2" /> : a === 'resolved' ? <CheckCircle className="size-4 mr-2" /> : a === 'closed' ? <XCircle className="size-4 mr-2" /> : null}
                        {a === 'processing' ? '接单' : a === 'waiting_confirm' ? '待确认' : a === 'resolved' ? '已解决' : a === 'closed' ? '关闭' : STATUS_LABELS[a]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default WorkOrderDetailPanel;