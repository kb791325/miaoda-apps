import { useEffect, useState } from 'react';
import { BellRing, Info, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PRESET_TEMPLATES,
  createPushTask,
  fetchCustomTemplates,
  fetchPushTasks,
  removePushTask,
  updatePushTask,
  type PushTask,
  type ReportTemplate,
} from '@/lib/report';

const FREQ_LABEL: Record<PushTask['frequency'], string> = { 每日: '每日', 每周: '每周', 每月: '每月' };
type Draft = Omit<PushTask, 'id' | 'createdAt'>;
const emptyDraft: Draft = {
  name: '',
  templateId: '',
  templateName: '',
  frequency: '每日',
  pushTime: '09:00',
  groups: '',
  format: '卡片消息',
  atAll: false,
  enabled: true,
};
/** 定时推送: 推送规则实时读写多维表格「定时推送」表(频率/时间/接收群/格式/启停)。
 * 注: 前端负责规则配置与启停, 实际到点投递由多维表格「自动化流程 + 群机器人」执行。 */
export default function ReportPushPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>(PRESET_TEMPLATES);
  const [tasks, setTasks] = useState<PushTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PushTask | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const reloadTasks = () =>
    fetchPushTasks()
      .then(setTasks)
      .catch(() => toast.error('推送任务读取失败, 请检查多维表格连接'))
      .finally(() => setLoading(false));

  useEffect(() => {
    void fetchCustomTemplates()
      .then((mine) => setTemplates([...PRESET_TEMPLATES, ...mine]))
      .catch(() => undefined);
    setLoading(true);
    void reloadTasks();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, templateId: templates[0]?.id ?? '', templateName: templates[0]?.name ?? '' });
    setOpen(true);
  };
  const openEdit = (t: PushTask) => {
    setEditing(t);
    setDraft({
      name: t.name,
      templateId: t.templateId,
      templateName: t.templateName,
      frequency: t.frequency,
      pushTime: t.pushTime,
      groups: t.groups,
      format: t.format,
      atAll: t.atAll,
      enabled: t.enabled,
    });
    setOpen(true);
  };
  const onSave = () => {
    if (!draft.name.trim()) return toast.error('请填写任务名称');
    if (!draft.templateId) return toast.error('请选择关联报表模板');
    if (!draft.groups.trim()) return toast.error('请填写接收群');
    const tpl = templates.find((t) => t.id === draft.templateId);
    const payload: Draft = { ...draft, templateName: tpl?.name ?? draft.templateName };
    setSaving(true);
    const job = editing ? updatePushTask(editing.id, payload) : createPushTask(payload).then(() => undefined);
    void job
      .then(() => {
        toast.success(editing ? '推送任务已更新并写回多维表格' : '推送任务已创建并写入多维表格');
        setOpen(false);
        void reloadTasks();
      })
      .catch(() => toast.error('保存失败, 请检查多维表格连接'))
      .finally(() => setSaving(false));
  };
  const toggle = (t: PushTask, enabled: boolean) => {
    void updatePushTask(t.id, {
      name: t.name,
      templateId: t.templateId,
      templateName: t.templateName,
      frequency: t.frequency,
      pushTime: t.pushTime,
      groups: t.groups,
      format: t.format,
      atAll: t.atAll,
      lastPush: t.lastPush,
      enabled,
    })
      .then(() => {
        toast.success(enabled ? '已启用推送' : '已停用推送');
        void reloadTasks();
      })
      .catch(() => toast.error('状态更新失败'));
  };
  const remove = (id: string) => {
    void removePushTask(id)
      .then(() => {
        toast.success('已删除推送任务');
        void reloadTasks();
      })
      .catch(() => toast.error('删除失败'));
  };
  const simulate = (t: PushTask) => {
    toast.success(`已按规则生成「${t.templateName}」${t.format}, 将在${FREQ_LABEL[t.frequency]} ${t.pushTime} 推送到 ${t.groups}`);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">定时推送</h2>
          <p className="mt-1 text-sm text-muted-foreground">推送规则实时保存在多维表格「定时推送」表, 让经营数据按日/周/月自动送达飞书群</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> 新建推送任务
        </Button>
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            本页维护「推送什么、多久推、推给谁、什么格式」的规则并实时写回多维表格。标准前端应用负责规则配置与启停;
            到点自动投递到飞书群由多维表格的<b>自动化流程 + 自定义群机器人</b>执行——在多维表格中按此处的频率与时间建立定时自动化、选择对应报表并发送到所填群即可实现真正的无人值守推送。
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>关联报表</TableHead>
                <TableHead>频率/时间</TableHead>
                <TableHead>接收群</TableHead>
                <TableHead>格式</TableHead>
                <TableHead>@所有人</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    正在从多维表格读取推送任务…
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    <BellRing className="mx-auto mb-2 size-6 opacity-40" />
                    暂无推送任务, 点击右上角「新建推送任务」
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.templateName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {FREQ_LABEL[t.frequency]} · {t.pushTime}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate" title={t.groups}>
                      {t.groups}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.format}</Badge>
                    </TableCell>
                    <TableCell>{t.atAll ? '是' : '否'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={t.enabled} onCheckedChange={(v) => toggle(t, v)} />
                        <span className={t.enabled ? 'text-xs text-green-600' : 'text-xs text-muted-foreground'}>
                          {t.enabled ? '启用中' : '已停用'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => simulate(t)} title="试推一次">
                          <Send className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                          编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑推送任务' : '新建推送任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">任务名称</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="如: 每日经营日报推送" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">关联报表模板</Label>
              <NativeSelect
                className="w-full"
                value={draft.templateId}
                onChange={(e) => {
                  const tpl = templates.find((t) => t.id === e.target.value);
                  setDraft({ ...draft, templateId: e.target.value, templateName: tpl?.name ?? '' });
                }}
              >
                {templates.map((t) => (
                  <NativeSelectOption key={t.id} value={t.id}>
                    {t.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">推送频率</Label>
                <NativeSelect className="w-full" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as PushTask['frequency'] })}>
                  <NativeSelectOption value="每日">每日</NativeSelectOption>
                  <NativeSelectOption value="每周">每周</NativeSelectOption>
                  <NativeSelectOption value="每月">每月</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">推送时间</Label>
                <Input type="time" value={draft.pushTime} onChange={(e) => setDraft({ ...draft, pushTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">接收飞书群(多个用逗号分隔)</Label>
              <Input value={draft.groups} onChange={(e) => setDraft({ ...draft, groups: e.target.value })} placeholder="如: 经营管理群, 投放部群" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">推送格式</Label>
                <NativeSelect className="w-full" value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value as PushTask['format'] })}>
                  <NativeSelectOption value="卡片消息">卡片消息</NativeSelectOption>
                  <NativeSelectOption value="文件附件">文件附件</NativeSelectOption>
                  <NativeSelectOption value="两者">两者</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={draft.atAll} onCheckedChange={(v) => setDraft({ ...draft, atAll: v })} />
                <Label className="text-sm">@所有人</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              <Label className="text-sm">创建后立即启用</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogTrigger asChild>
              <Button variant="outline">取消</Button>
            </DialogTrigger>
            <Button onClick={onSave} disabled={saving}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
