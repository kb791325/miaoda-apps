import { useState, useEffect, useCallback } from 'react';
import { t } from '@/lib/i18n';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, User } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { leadsApi } from '@/api';
import { formatDateTime } from '@/lib/format';
import type { Lead, FollowUp } from '@/api/types';

const STATUS_MAP: Record<string, string> = {
  pending: '待跟进',
  following: '跟进中',
  converted: '已转化',
  lost: '已流失',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  following: 'info',
  converted: 'success',
  lost: 'danger',
};

const FOLLOW_TYPE_OPTIONS = [
  { label: '电话', value: '电话' },
  { label: '拜访', value: '拜访' },
  { label: '微信', value: '微信' },
  { label: '邮件', value: '邮件' },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('电话');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [leadRes, followRes] = await Promise.all([
        leadsApi.get(Number(id)),
        leadsApi.getFollowUps(Number(id)),
      ]);
      if (leadRes.code === 0) setLead(leadRes.data);
      if (followRes.code === 0) setFollowUps(followRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddFollowUp = async () => {
    if (!id) return;
    if (!newContent.trim()) {
      toast.warning('请输入跟进内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await leadsApi.addFollowUp(Number(id), {
        follow_content: newContent.trim(),
        follow_type: newType,
      });
      if (res.code === 0) {
        toast.success('跟进记录已添加');
        setNewContent('');
        load();
      } else {
        toast.error(res.message || '添加失败');
      }
    } catch {
      toast.error('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> 返回
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">线索不存在或已被删除</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={t('线索详情')} description={t('线索 ID：') + lead.id} />
        <Button variant="outline" size="sm" onClick={() => navigate('/customer/clues')}>
          <ArrowLeft className="size-4" /> 返回线索列表
        </Button>
      </div>

      {/* 基本信息 */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="size-4 text-primary" />
              {lead.lead_name}
            </CardTitle>
            <StatusBadge status={STATUS_MAP[lead.status] || lead.status} variant={STATUS_VARIANT[lead.status] || 'default'} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
            <div><span className="text-muted-foreground">客户/公司：</span>{lead.company_name || '-'}</div>
            <div><span className="text-muted-foreground">线索来源：</span>{lead.source || '-'}</div>
            <div><span className="text-muted-foreground">联系电话：</span>{lead.phone || '-'}</div>
            <div><span className="text-muted-foreground">邮箱：</span>{lead.email || '-'}</div>
            <div><span className="text-muted-foreground">最近跟进：</span>{lead.last_follow_at ? formatDateTime(lead.last_follow_at) : '-'}</div>
            <div><span className="text-muted-foreground">创建时间：</span>{formatDateTime(lead.created_at)}</div>
            {lead.remark && (
              <div className="md:col-span-3"><span className="text-muted-foreground">备注：</span>{lead.remark}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 跟进记录 */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">跟进记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 新增跟进 */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">选择跟进方式</span>
            </div>
            <Textarea
              placeholder="请输入本次跟进内容..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <Button size="sm" onClick={handleAddFollowUp} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              添加跟进记录
            </Button>
          </div>

          {/* 时间线 */}
          {followUps.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">暂无跟进记录</div>
          ) : (
            <div className="relative space-y-0 pl-6">
              <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
              {followUps.map((f) => (
                <div key={f.id} className="relative pb-5 last:pb-0">
                  <div className="absolute -left-6 top-1 size-3.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{f.follow_type || '跟进'}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(f.created_at)}</span>
                    <span className="text-xs text-muted-foreground">· {f.creator_name || '-'}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{f.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
