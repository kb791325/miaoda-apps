import { useState, useMemo, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { Plus, Trash2, Star, UserCheck, UserX, CalendarDays, Target, Users, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatDate } from '@/lib/format';
import { interviewsApi, checkinsApi, recruitPlansApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// ==================== 面试管理 ====================
const INT_STATUS_OPTS = [
  { label: '待评价', value: 'pending' },
  { label: '通过', value: 'passed' },
  { label: '不通过', value: 'failed' },
  { label: '已录用', value: 'hired' },
  { label: '待定', value: 'hold' },
];
const INT_STATUS_MAP: Record<string, string> = {
  pending: '待评价', passed: '通过', failed: '不通过', hired: '已录用', hold: '待定',
};
const INT_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', passed: 'success', failed: 'danger', hired: 'success', hold: 'info',
};
const INT_ROUND_OPTS = [
  { label: '初面', value: '初面' },
  { label: '复试', value: '复试' },
  { label: '终面', value: '终面' },
];
const INT_MODE_OPTS = [
  { label: '现场', value: 'onsite' },
  { label: '视频', value: 'video' },
  { label: '电话', value: 'phone' },
];
const INT_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '候选人/岗位', type: 'input', placeholder: '搜索候选人/岗位' },
  { key: 'status', label: '状态', type: 'select', options: INT_STATUS_OPTS },
  { key: 'round', label: '轮次', type: 'select', options: INT_ROUND_OPTS },
  { key: 'interviewer_name', label: '面试官', type: 'input', placeholder: '面试官姓名' },
];
const INT_FORM: FormFieldDef[] = [
  { key: 'candidate_name', label: '候选人姓名', required: true, placeholder: '请输入候选人姓名' },
  { key: 'position', label: '应聘岗位', required: true, placeholder: '如 商务专员' },
  { key: 'round', label: '面试轮次', type: 'select', required: true, options: INT_ROUND_OPTS, defaultValue: '初面' },
  { key: 'interviewer_name', label: '面试官', required: true, placeholder: '如 张伟' },
  { key: 'interview_time', label: '面试时间', type: 'datetime', required: true },
  { key: 'interview_mode', label: '面试形式', type: 'select', required: true, options: INT_MODE_OPTS, defaultValue: 'onsite' },
  { key: 'status', label: '状态', type: 'select', required: true, options: INT_STATUS_OPTS, defaultValue: 'pending' },
  { key: 'score', label: '评分(0-5)', placeholder: '留空表示未评分' },
  { key: 'evaluation', label: '评价', type: 'textarea', placeholder: '请输入面试评价' },
  { key: 'suggestion', label: '面试建议', placeholder: '如 进入复试/发offer' },
];

function StarRating({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`p-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`size-5 ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
      {!readOnly && <span className="ml-2 text-sm text-muted-foreground tabular-nums">{value.toFixed(1)}</span>}
    </div>
  );
}

export function InterviewPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record<string, any> | null>(null);
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalRecord, setEvalRecord] = useState<Record<string, any> | null>(null);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [arrangeRecord, setArrangeRecord] = useState<Record<string, any> | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const table = useServerList({ fetchFn: interviewsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'interview_no', title: '面试ID', width: '110px', sortable: true, render: (r) => <>{r.interview_no || '-'}</> },
    { key: 'candidate_name', title: '候选人', width: '100px', render: (r) => <span className="font-medium">{r.candidate_name}</span> },
    { key: 'position', title: '岗位', width: '120px', render: (r) => <>{r.position || '-'}</> },
    { key: 'round', title: '轮次', width: '80px', render: (r) => <Badge variant="outline" className="font-normal">{r.round}</Badge> },
    { key: 'interviewer_name', title: '面试官', width: '90px', render: (r) => <>{r.interviewer_name || '-'}</> },
    { key: 'interview_time', title: '面试时间', width: '160px', sortable: true, render: (r) => <span className="tabular-nums text-sm">{formatDateTime(r.interview_time)}</span> },
    { key: 'interview_mode', title: '形式', width: '70px', render: (r) => r.interview_mode === 'onsite' ? '现场' : r.interview_mode === 'video' ? '视频' : '电话' },
    {
      key: 'score', title: '评分', width: '100px',
      render: (r) => (r.score && r.score > 0 ? (
        <div className="flex items-center gap-1">
          <Star className="size-3.5 text-amber-400 fill-amber-400" />
          <span className="tabular-nums text-sm font-medium">{Number(r.score).toFixed(1)}</span>
        </div>
      ) : <span className="text-muted-foreground text-sm">未评分</span>),
    },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={INT_STATUS_MAP[r.status] || r.status} variant={INT_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, score: Number(values.score) || 0 };
    try {
      if (editRecord) {
        const res = await interviewsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('面试记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await interviewsApi.create(data);
      if (res.code === 0) { toast.success('面试记录已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await interviewsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('面试管理')} description={t('管理面试安排、评价和录用决策')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={INT_FILTERS}
        primaryActions={[
          { label: '安排面试', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => {
          const actions: any[] = [
            { label: '查看详情', onClick: () => { setDetailRecord(r); setDetailOpen(true); } },
          ];
          if (r.status === 'pending') {
            actions.push({ label: '填写评价', onClick: () => { setEvalRecord(r); setEvalOpen(true); } });
          }
          if (r.status === 'passed' && r.round !== '终面') {
            actions.push({ label: '安排复试', onClick: () => { setArrangeRecord(r); setArrangeOpen(true); } });
          }
          actions.push(
            { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
            { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
          );
          return actions;
        }}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />

      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑面试：${editRecord.candidate_name}` : '安排面试'}
        description={t('录入面试安排信息，带 * 为必填项')}
        fields={INT_FORM} submitLabel={editRecord ? '保存修改' : '确认安排'}
        onSubmit={handleSave} initialValues={editRecord}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该面试记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后面试记录将不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 评价弹窗 */}
      <EvaluateDialog
        open={evalOpen}
        record={evalRecord}
        onOpenChange={setEvalOpen}
        onSuccess={() => { table.refresh(); }}
      />

      {/* 安排复试弹窗 */}
      <ArrangeNextDialog
        open={arrangeOpen}
        record={arrangeRecord}
        onOpenChange={setArrangeOpen}
        onSuccess={() => { table.refresh(); }}
      />

      {/* 详情弹窗 - 面试时间线 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>面试详情</DialogTitle>
            <DialogDescription>候选人：{detailRecord?.candidate_name} · {detailRecord?.position}</DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">面试ID：</span>{detailRecord.interview_no}</div>
                <div><span className="text-muted-foreground">轮次：</span>{detailRecord.round}</div>
                <div><span className="text-muted-foreground">形式：</span>{INT_MODE_OPTS.find(o => o.value === detailRecord.interview_mode)?.label || detailRecord.interview_mode}</div>
                <div><span className="text-muted-foreground">面试官：</span>{detailRecord.interviewer_name}</div>
                <div className="col-span-2"><span className="text-muted-foreground">时间：</span>{formatDateTime(detailRecord.interview_time)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">当前面试评价</div>
                {detailRecord.score > 0 ? (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <StarRating value={detailRecord.score} readOnly />
                      <StatusBadge status={INT_STATUS_MAP[detailRecord.status] || detailRecord.status} variant={INT_STATUS_VARIANT[detailRecord.status] || 'default'} />
                    </div>
                    {detailRecord.evaluation && (
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">评价内容：</div>
                        <div className="bg-muted/40 p-3 rounded-md">{detailRecord.evaluation}</div>
                      </div>
                    )}
                    {detailRecord.suggestion && (
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">面试建议：</div>
                        <div className="text-primary font-medium">{detailRecord.suggestion}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">暂无评价</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">面试轮次时间线</div>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {['初面', '复试', '终面'].map((round, idx) => {
                    const done = detailRecord.round === round || ['初面', '复试', '终面'].indexOf(detailRecord.round) > idx;
                    const isCurrent = detailRecord.round === round;
                    return (
                      <div key={round} className="relative">
                        <div className={`absolute -left-6 top-1 size-[18px] rounded-full border-2 ${done ? 'border-primary bg-primary' : 'border-border bg-background'} ${isCurrent ? 'ring-4 ring-primary/20' : ''}`} />
                        <div className={`text-sm font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {round}
                          {isCurrent && <Badge className="ml-2" variant="outline">当前</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {done ? '已完成' : '待安排'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 评价弹窗
function EvaluateDialog({ open, record, onOpenChange, onSuccess }: {
  open: boolean; record: Record<string, any> | null; onOpenChange: (o: boolean) => void; onSuccess: () => void;
}) {
  const [score, setScore] = useState(4);
  const [status, setStatus] = useState('passed');
  const [evaluation, setEvaluation] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && record) {
      setScore(Number(record.score) || 4);
      setStatus(record.status === 'pending' ? 'passed' : record.status);
      setEvaluation(record.evaluation || '');
      setSuggestion(record.suggestion || '');
    }
  }, [open, record]);

  const handleSubmit = async () => {
    if (!record) return;
    setSubmitting(true);
    try {
      const res = await interviewsApi.evaluate(record.id, { score, status, evaluation, suggestion });
      if (res.code === 0) {
        toast.success('评价已提交');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || '提交失败');
      }
    } catch {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>填写面试评价</DialogTitle>
          <DialogDescription>候选人：{record?.candidate_name} · {record?.position} · {record?.round}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>综合评分</Label>
            <StarRating value={score} onChange={setScore} />
          </div>
          <div className="space-y-2">
            <Label>面试结论</Label>
            <RadioGroup value={status} onValueChange={setStatus} className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="passed" id="ev-passed" />
                <Label htmlFor="ev-passed" className="cursor-pointer">通过</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="failed" id="ev-failed" />
                <Label htmlFor="ev-failed" className="cursor-pointer">不通过</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hold" id="ev-hold" />
                <Label htmlFor="ev-hold" className="cursor-pointer">待定</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hired" id="ev-hired" />
                <Label htmlFor="ev-hired" className="cursor-pointer">已录用</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-eval">优势与不足</Label>
            <Textarea id="ev-eval" value={evaluation} onChange={(e) => setEvaluation(e.target.value)} placeholder="请输入对候选人的综合评价，包括优势、不足等" rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-sug">面试建议</Label>
            <Input id="ev-sug" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="如 进入复试/发offer/备选" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? '提交中...' : '提交评价'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 安排下一轮面试弹窗
function ArrangeNextDialog({ open, record, onOpenChange, onSuccess }: {
  open: boolean; record: Record<string, any> | null; onOpenChange: (o: boolean) => void; onSuccess: () => void;
}) {
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewMode, setInterviewMode] = useState('onsite');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && record) {
      setInterviewerName('李娜');
      setInterviewTime('');
      setInterviewMode('onsite');
    }
  }, [open, record]);

  const handleSubmit = async () => {
    if (!record) return;
    if (!interviewTime) {
      toast.error('请选择面试时间');
      return;
    }
    setSubmitting(true);
    try {
      const res = await interviewsApi.arrangeNext(record.id, { interviewer_name: interviewerName, interview_time: interviewTime, interview_mode: interviewMode });
      if (res.code === 0) {
        toast.success('复试已安排');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || '安排失败');
      }
    } catch {
      toast.error('安排失败');
    } finally {
      setSubmitting(false);
    }
  };

  const nextRound = record?.round === '初面' ? '复试' : '终面';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>安排{nextRound}</DialogTitle>
          <DialogDescription>候选人：{record?.candidate_name} · {record?.position}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="arr-interviewer">面试官</Label>
            <Input id="arr-interviewer" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} placeholder="请输入面试官姓名" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arr-time">面试时间</Label>
            <Input id="arr-time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} placeholder="如 2026-09-15 14:00" />
          </div>
          <div className="space-y-2">
            <Label>面试形式</Label>
            <Select value={interviewMode} onValueChange={setInterviewMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onsite">现场面试</SelectItem>
                <SelectItem value="video">视频面试</SelectItem>
                <SelectItem value="phone">电话面试</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? '安排中...' : `确认安排${nextRound}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 签到管理 ====================
const CK_STATUS_OPTS = [
  { label: '已签到', value: 'checked_in' },
  { label: '未到', value: 'absent' },
  { label: '迟到', value: 'late' },
  { label: '待签到', value: 'pending' },
];
const CK_STATUS_MAP: Record<string, string> = {
  checked_in: '已签到', absent: '未到', late: '迟到', pending: '待签到',
};
const CK_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  checked_in: 'success', absent: 'danger', late: 'warning', pending: 'info',
};
const CK_TYPE_OPTS = [
  { label: '面试签到', value: 'interview' },
  { label: '入职签到', value: 'onboard' },
];
const CK_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '姓名/岗位', type: 'input', placeholder: '搜索姓名/岗位' },
  { key: 'status', label: '状态', type: 'select', options: CK_STATUS_OPTS },
  { key: 'checkin_type', label: '类型', type: 'select', options: CK_TYPE_OPTS },
];
const CK_FORM: FormFieldDef[] = [
  { key: 'candidate_name', label: '姓名', required: true, placeholder: '请输入姓名' },
  { key: 'position', label: '岗位', required: true, placeholder: '应聘/入职岗位' },
  { key: 'checkin_type', label: '签到类型', type: 'select', required: true, options: CK_TYPE_OPTS, defaultValue: 'interview' },
  { key: 'appointment_time', label: '预约时间', type: 'datetime', required: true },
  { key: 'checkin_method', label: '签到方式', placeholder: '如 前台扫码/HR系统' },
  { key: 'status', label: '状态', type: 'select', required: true, options: CK_STATUS_OPTS, defaultValue: 'pending' },
  { key: 'remark', label: '备注', type: 'textarea', placeholder: '可选' },
];

export function CheckinPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const [filterDate, setFilterDate] = useState<string>('');
  const table = useServerList({ fetchFn: checkinsApi.list, defaultPageSize: 20 });

  useEffect(() => {
    checkinsApi.stats().then((res: any) => {
      if (res.code === 0) setStats(res.data);
    });
  }, [table.data]);

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'checkin_no', title: '签到ID', width: '110px', sortable: true, render: (r) => <>{r.checkin_no || '-'}</> },
    { key: 'candidate_name', title: '姓名', width: '100px', render: (r) => <span className="font-medium">{r.candidate_name}</span> },
    { key: 'position', title: '岗位', width: '120px', render: (r) => <>{r.position || '-'}</> },
    { key: 'checkin_type', title: '类型', width: '100px', render: (r) => r.checkin_type === 'interview' ? '面试签到' : '入职签到' },
    { key: 'appointment_time', title: '预约时间', width: '160px', sortable: true, render: (r) => <span className="tabular-nums text-sm">{formatDateTime(r.appointment_time)}</span> },
    { key: 'checkin_time', title: '实际签到', width: '160px', render: (r) => r.checkin_time ? <span className="tabular-nums text-sm text-success">{formatDateTime(r.checkin_time)}</span> : <span className="text-muted-foreground">—</span> },
    { key: 'checkin_method', title: '签到方式', width: '100px', render: (r) => r.checkin_method || '—' },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={CK_STATUS_MAP[r.status] || r.status} variant={CK_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await checkinsApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('签到记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await checkinsApi.create(values);
      if (res.code === 0) { toast.success('签到记录已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await checkinsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const handleRegister = async (id: number) => {
    await withOpLock(async () => {
      const recordId = validateRecordId({ id });
      if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await checkinsApi.register(id, {});
        if (res.code === 0) {
          toast.success(res.data?.status === 'late' ? '已签到（迟到）' : '签到成功');
          table.refresh();
        } else {
          toast.error(res.message || '签到失败');
        }
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const handleMarkAbsent = async (id: number) => {
    await withOpLock(async () => {
      const recordId = validateRecordId({ id });
      if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await checkinsApi.markAbsent(id, '');
        if (res.code === 0) { toast.success('已标记未到'); table.refresh(); }
        else toast.error(res.message || '操作失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const statCards = stats ? [
    { label: '今日应到', value: stats.total, icon: <Users className="size-4" />, color: 'text-primary' },
    { label: '已签到', value: stats.checked, icon: <UserCheck className="size-4" />, color: 'text-success' },
    { label: '未到', value: stats.absent, icon: <UserX className="size-4" />, color: 'text-destructive' },
    { label: '迟到', value: stats.late, icon: <Clock className="size-4" />, color: 'text-warning' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`size-10 rounded-lg bg-muted/50 flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ServerListPage
        title={t('签到管理')} description={t('管理面试/入职签到记录')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={CK_FILTERS}
        primaryActions={[
          { label: '登记签到', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => {
          const actions: any[] = [];
          if (r.status === 'pending') {
            actions.push(
              { label: '签到', onClick: () => handleRegister(r.id) },
              { label: '标记未到', variant: 'destructive' as const, onClick: () => handleMarkAbsent(r.id) },
            );
          }
          actions.push(
            { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
            { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
          );
          return actions;
        }}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />

      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑签到：${editRecord.candidate_name}` : '登记签到'}
        description={t('录入签到信息，带 * 为必填项')}
        fields={CK_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该签到记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后签到记录将不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== 招聘计划 ====================
const RP_STATUS_OPTS = [
  { label: '招聘中', value: 'recruiting' },
  { label: '已完成', value: 'completed' },
  { label: '已暂停', value: 'paused' },
  { label: '已取消', value: 'cancelled' },
];
const RP_STATUS_MAP: Record<string, string> = {
  recruiting: '招聘中', completed: '已完成', paused: '已暂停', cancelled: '已取消',
};
const RP_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  recruiting: 'success', completed: 'info', paused: 'warning', cancelled: 'danger',
};
const RP_URGENCY_OPTS = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
];
const RP_URGENCY_MAP: Record<string, string> = { high: '高', medium: '中', low: '低' };
const RP_URGENCY_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  high: 'danger', medium: 'warning', low: 'info',
};
const RP_DEPT_OPTS = [
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '商务三部', value: '商务三部' },
  { label: '优化部', value: '优化部' },
  { label: '视频部', value: '视频部' },
  { label: '财务部', value: '财务部' },
  { label: '行政人事部', value: '行政人事部' },
  { label: '技术部', value: '技术部' },
];
const RP_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '岗位/部门', type: 'input', placeholder: '搜索岗位/部门' },
  { key: 'status', label: '状态', type: 'select', options: RP_STATUS_OPTS },
  { key: 'urgency', label: '优先级', type: 'select', options: RP_URGENCY_OPTS },
  { key: 'department', label: '部门', type: 'select', options: RP_DEPT_OPTS },
];
const RP_FORM: FormFieldDef[] = [
  { key: 'position', label: '招聘岗位', required: true, placeholder: '如 商务专员' },
  { key: 'department', label: '所属部门', type: 'select', required: true, options: RP_DEPT_OPTS, defaultValue: '商务一部' },
  { key: 'headcount', label: '需求人数', required: true, placeholder: '如 3' },
  { key: 'onboarded', label: '已入职人数', placeholder: '默认 0' },
  { key: 'recruiting', label: '招聘中人数', placeholder: '默认 0' },
  { key: 'urgency', label: '优先级', type: 'select', required: true, options: RP_URGENCY_OPTS, defaultValue: 'medium' },
  { key: 'expected_date', label: '期望到岗时间', type: 'date', required: true },
  { key: 'owner_name', label: '负责人', required: true, placeholder: '如 张伟' },
  { key: 'status', label: '状态', type: 'select', required: true, options: RP_STATUS_OPTS, defaultValue: 'recruiting' },
  { key: 'remark', label: '备注说明', type: 'textarea', placeholder: '可选' },
];

export function RecruitPlanPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const table = useServerList({ fetchFn: recruitPlansApi.list, defaultPageSize: 20 });

  useEffect(() => {
    recruitPlansApi.stats().then((res: any) => {
      if (res.code === 0) setStats(res.data);
    });
  }, [table.data]);

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'plan_no', title: '计划ID', width: '110px', sortable: true, render: (r) => <>{r.plan_no || '-'}</> },
    { key: 'position', title: '招聘岗位', width: '130px', render: (r) => <span className="font-medium">{r.position}</span> },
    { key: 'department', title: '部门', width: '110px', render: (r) => <>{r.department || '-'}</> },
    {
      key: 'progress', title: '招聘进度', width: '220px',
      render: (r) => {
        const total = Number(r.headcount) || 0;
        const done = Number(r.onboarded) || 0;
        const rate = total > 0 ? Math.round(done / total * 100) : 0;
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">已入职 {done} / 需求 {total}</span>
              <span className="tabular-nums font-medium">{rate}%</span>
            </div>
            <Progress value={rate} className="h-1.5" />
          </div>
        );
      },
    },
    { key: 'recruiting', title: '招聘中', width: '90px', align: 'right', render: (r) => <span className="tabular-nums">{r.recruiting || 0} 人</span> },
    { key: 'urgency', title: '优先级', width: '80px', render: (r) => <StatusBadge status={RP_URGENCY_MAP[r.urgency] || r.urgency} variant={RP_URGENCY_VARIANT[r.urgency] || 'default'} /> },
    { key: 'expected_date', title: '期望到岗', width: '120px', sortable: true, render: (r) => <span className="tabular-nums text-sm">{formatDate(r.expected_date)}</span> },
    { key: 'owner_name', title: '负责人', width: '90px', render: (r) => <>{r.owner_name || '-'}</> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={RP_STATUS_MAP[r.status] || r.status} variant={RP_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      headcount: Number(values.headcount) || 0,
      onboarded: Number(values.onboarded) || 0,
      recruiting: Number(values.recruiting) || 0,
    };
    try {
      if (editRecord) {
        const res = await recruitPlansApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('招聘计划已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await recruitPlansApi.create(data);
      if (res.code === 0) { toast.success('招聘计划已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await recruitPlansApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const statCards = stats ? [
    { label: '计划总数', value: stats.total, icon: <Target className="size-4" />, valueClass: 'text-primary' },
    { label: '招聘中', value: stats.recruiting, icon: <Users className="size-4" />, valueClass: 'text-success' },
    { label: '本月入职', value: stats.thisMonthOnboard, icon: <UserCheck className="size-4" />, valueClass: 'text-info' },
    { label: '完成率', value: `${stats.completionRate}%`, icon: <CalendarDays className="size-4" />, valueClass: 'text-warning' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`size-10 rounded-lg bg-muted/50 flex items-center justify-center ${s.valueClass}`}>{s.icon}</div>
              <div>
                <div className={`text-2xl font-bold tabular-nums ${s.valueClass}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ServerListPage
        title={t('招聘计划')} description={t('管理各部门招聘需求和进度')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={RP_FILTERS}
        primaryActions={[
          { label: '新建计划', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => {
          const actions: any[] = [];
          if (r.status === 'recruiting') {
            actions.push({ label: '暂停招聘', onClick: () => withOpLock(async () => {
              const recordId = validateRecordId({ id: r.id });
              if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
              try {
                const res = await recruitPlansApi.update(r.id, { status: 'paused' });
                if (res.code === 0) { toast.success('已暂停招聘'); table.refresh(); }
              } catch (e) { toast.error(extractErrorMessage(e)); }
            }) });
          }
          if (r.status === 'paused') {
            actions.push({ label: '恢复招聘', onClick: () => withOpLock(async () => {
              const recordId = validateRecordId({ id: r.id });
              if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
              try {
                const res = await recruitPlansApi.update(r.id, { status: 'recruiting' });
                if (res.code === 0) { toast.success('已恢复招聘'); table.refresh(); }
              } catch (e) { toast.error(extractErrorMessage(e)); }
            }) });
          }
          if (r.status !== 'completed' && r.status !== 'cancelled') {
            actions.push({ label: '标记完成', onClick: () => withOpLock(async () => {
              const recordId = validateRecordId({ id: r.id });
              if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
              try {
                const res = await recruitPlansApi.update(r.id, { status: 'completed' });
                if (res.code === 0) { toast.success('已标记完成'); table.refresh(); }
              } catch (e) { toast.error(extractErrorMessage(e)); }
            }) });
          }
          actions.push(
            { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
            { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
          );
          return actions;
        }}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />

      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑计划：${editRecord.position}` : '新建招聘计划'}
        description={t('录入招聘计划信息，带 * 为必填项')}
        fields={RP_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该招聘计划？</AlertDialogTitle>
            <AlertDialogDescription>删除后招聘计划将不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
