import { useState, useMemo, useRef, useEffect } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, UserPlus, Users, Trash2, Upload, Shuffle, Download, FileText, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { publicLeadsApi, usersApi, invalidLeadsApi, employeesApi, settingsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
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
import type { PublicLead, UserItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormDraft } from '@/hooks/useFormDraft';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { exportCSV } from '@/lib/export';
import { Save } from 'lucide-react';

const TIER_OPTIONS = [
  { label: 'A级', value: 'A' },
  { label: 'B级', value: 'B' },
  { label: 'C级', value: 'C' },
  { label: 'D级', value: 'D' },
];

const INDUSTRY_OPTIONS = [
  { label: '电商', value: '电商' },
  { label: '教育', value: '教育' },
  { label: '游戏', value: '游戏' },
  { label: '金融', value: '金融' },
  { label: '本地生活', value: '本地生活' },
  { label: '家居', value: '家居' },
  { label: '美妆', value: '美妆' },
];

const STATUS_OPTIONS = [
  { label: '待分配', value: 'pending' },
  { label: '已分配', value: 'assigned' },
];

const FILTER_FIELDS: FilterField[] = [
  { key: 'keyword', label: '主体名称', type: 'input', placeholder: '请输入主体名称' },
  { key: 'lead_level', label: '客资分层', type: 'select', options: TIER_OPTIONS },
  { key: 'primary_industry', label: '一级行业', type: 'select', options: INDUSTRY_OPTIONS },
  { key: 'assign_status', label: '分配状态', type: 'select', options: STATUS_OPTIONS },
  { key: 'secondary_industry', label: '二级行业', type: 'input', placeholder: '二级行业', advanced: true },
  { key: 'entered_range', label: '调入公海时间', type: 'date-range', advanced: true },
  { key: 'creator_id', label: '创建人', type: 'select', options: [], advanced: true },
];

const STATUS_MAP: Record<string, string> = {
  pending: '待分配',
  assigned: '已分配',
};

type AssignRule = 'round_robin' | 'by_department';

const ASSIGN_RULE_LABEL: Record<AssignRule, string> = {
  round_robin: '负责人轮询',
  by_department: '按部门轮流',
};

interface PublicLeadRow extends PublicLead {
  owner_name?: string;
  pool_time?: string;
}

interface CandidateOwner {
  name: string;
  department: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeAssignRule(value: unknown): AssignRule {
  return value === 'by_department' ? 'by_department' : 'round_robin';
}

function orderCandidates(candidates: CandidateOwner[], rule: AssignRule): CandidateOwner[] {
  if (rule === 'round_robin') return candidates;
  const byDept = new Map<string, CandidateOwner[]>();
  candidates.forEach((e) => {
    const key = e.department || '未分组';
    const arr = byDept.get(key) || [];
    arr.push(e);
    byDept.set(key, arr);
  });
  const depts = Array.from(byDept.keys()).sort((a, b) => a.localeCompare(b, 'zh'));
  const maxLen = depts.reduce((m: number, d: string) => Math.max(m, (byDept.get(d) as CandidateOwner[]).length), 0);
  const ordered: CandidateOwner[] = [];
  for (let round = 0; round < maxLen; round += 1) {
    depts.forEach((d: string) => {
      const arr = byDept.get(d) as CandidateOwner[];
      if (round < arr.length) ordered.push(arr[round]);
    });
  }
  return ordered;
}

const IMPORT_ERROR_REASONS = ['主体名称缺失', '客资分层不在枚举内', '主体已存在（重复）', '手机号格式错误'];

const CREATE_INITIAL = {
  entity_name: '',
  lead_level: 'A',
  primary_industry: '电商',
  secondary_industry: '',
  source: '官网',
  remark: '',
};

export default function PublicSeaPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importStage, setImportStage] = useState<'idle' | 'parsing' | 'result'>('idle');
  const [importResult, setImportResult] = useState<{ success: number; fail: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<PublicLead | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [markInvalidOpen, setMarkInvalidOpen] = useState(false);
  const [markInvalidId, setMarkInvalidId] = useState<number | null>(null);
  const [invalidReason, setInvalidReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const [form, setForm] = useState<typeof CREATE_INITIAL>(CREATE_INITIAL);
  const [recycleDays, setRecycleDays] = useState(7);
  const [autoRule, setAutoRule] = useState<AssignRule>('round_robin');
  const draft = useFormDraft('public_sea', 'new', {
    getSummary: (data) => data.entity_name || '',
  });

  // 草稿恢复提示（简单自动恢复，有草稿就回填；编辑模式不应用草稿）
  useEffect(() => {
    if (createOpen && !editingLead && draft.hasDraft && draft.draft?.data) {
      setForm({ ...CREATE_INITIAL, ...draft.draft.data });
    }
  }, [createOpen, editingLead, draft.hasDraft, draft.draft]);

  // 自动保存（仅新建模式）
  useEffect(() => {
    if (!createOpen || editingLead) return;
    if (!form.entity_name.trim()) return;
    draft.scheduleAutoSave(form as Record<string, unknown>);
  }, [form, createOpen, editingLead, draft.scheduleAutoSave]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(CREATE_INITIAL);
    setCreateOpen(true);
  };

  const openEdit = (record: PublicLead) => {
    setEditingLead(record);
    setForm({
      entity_name: record.entity_name,
      lead_level: record.lead_level,
      primary_industry: record.primary_industry || '电商',
      secondary_industry: record.secondary_industry || '',
      source: record.source || '官网',
      remark: record.remark || '',
    });
    setCreateOpen(true);
  };

  const closeForm = () => {
    setCreateOpen(false);
    setEditingLead(null);
    setForm(CREATE_INITIAL);
  };

  const setField = (patch: Partial<typeof CREATE_INITIAL>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const table = useServerList({
    fetchFn: publicLeadsApi.list,
    defaultPageSize: 20,
  });

  const selectedNum = selectedKeys.length;
  const selectedIds = selectedKeys.map(Number);

  const loadUsers = async () => {
    if (users.length > 0) return;
    const res = await usersApi.list({ page: 1, page_size: 200 });
    if (res.code === 0 && res.data?.list) setUsers(res.data.list as UserItem[]);
  };

  useEffect(() => {
    loadUsers();
    (async () => {
      try {
        const res = await settingsApi.getGroup('public_sea');
        if (res.code === 0 && res.data) {
          const map = res.data as Record<string, string>;
          const days = Number(map.recycle_days);
          if (Number.isFinite(days) && days > 0) setRecycleDays(days);
          setAutoRule(normalizeAssignRule(map.assign_rule));
        }
      } catch (e) {
        logger.warn('[public-sea] load public_sea settings failed', e);
      }
    })();
  }, []);

  // 给创建人筛选下拉动态注入 options
  const filterFields = useMemo<FilterField[]>(() => {
    return FILTER_FIELDS.map(f => {
      if (f.key === 'creator_id') {
        return {
          ...f,
          options: users.length > 0
            ? [{ label: '全部', value: 'all' }, ...users.map(u => ({ label: u.name, value: String(u.id) }))]
            : [{ label: '全部', value: 'all' }],
        };
      }
      return f;
    });
  }, [users]);

  const handleMarkInvalid = (id: number) => {
    setMarkInvalidId(id);
    setInvalidReason('');
    setMarkInvalidOpen(true);
  };

  const submitMarkInvalid = async () => {
    await withOpLock(async () => {
      if (!markInvalidId || !invalidReason) {
        toast.warning('请填写无效原因');
        return;
      }
      const id = validateRecordId({ id: markInvalidId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setMarkInvalidId(null); setMarkInvalidOpen(false); return; }
      try {
        const res = await invalidLeadsApi.markInvalid(id, invalidReason);
        if (res.code === 0) {
          toast.success('已标记为无效客资');
          setMarkInvalidOpen(false);
          setMarkInvalidId(null);
          table.refresh();
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleValidate = () => {
    if (!form.entity_name.trim()) {
      toast.warning('请填写主体名称');
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = editingLead
        ? await publicLeadsApi.update(editingLead.id, form as any)
        : await publicLeadsApi.create(form as any);
      if (res.code === 0) {
        toast.success(editingLead ? '客资信息已更新' : '新建客资成功');
        if (!editingLead) draft.clearDraft();
        closeForm();
        table.refresh();
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch (e) {
      toast.error('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    exportCSV(
      '公海客资导入模板',
      ['主体名称', '客资分层', '一级行业', '二级行业', '客资来源', '备注'],
      [['示例科技有限公司', 'A', '电商', '服饰内衣', '官网', '']],
    );
    toast.success('模板已开始下载');
  };

  const handleDownloadErrorReport = () => {
    if (!importResult) return;
    const rows = Array.from({ length: importResult.fail }, (_, i) => [
      i + 1,
      `第 ${i + 1} 条记录`,
      IMPORT_ERROR_REASONS[i % IMPORT_ERROR_REASONS.length],
    ]);
    exportCSV(
      `导入错误报告_${importFileName || '客资'}`,
      ['序号', '数据行', '失败原因'],
      rows,
    );
    toast.success('错误报告已开始下载');
  };

  const columns: Column<PublicLead>[] = useMemo(() => {
    const dueMs = recycleDays * DAY_MS;
    const isRecycleDue = (r: PublicLead) => {
      const row = r as PublicLeadRow;
      if (row.assign_status !== 'pending') return false;
      const base = row.pool_time || row.created_at;
      if (!base) return false;
      const ts = new Date(base).getTime();
      if (!Number.isFinite(ts)) return false;
      return Date.now() - ts > dueMs;
    };
    return [
    { key: 'lead_no', title: '客资编号', width: '110px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.lead_no}</span> },
    {
      key: 'entity_name',
      title: '主体名称',
      dataIndex: 'entity_name' as const,
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{r.entity_name}</span>
          {isRecycleDue(r) && <StatusBadge status="已达回收周期" variant="warning" />}
        </div>
      ),
    },
    {
      key: 'lead_level',
      title: '客资分层',
      width: '90px',
      render: (r) => <StatusBadge status={r.lead_level} variant="info" />,
    },
    { key: 'primary_industry', title: '一级行业', dataIndex: 'primary_industry' as const, width: '100px' },
    { key: 'secondary_industry', title: '二级行业', dataIndex: 'secondary_industry' as const, width: '120px' },
    {
      key: 'assign_status',
      title: '分配状态',
      width: '100px',
      render: (r) => (
        <StatusBadge
          status={STATUS_MAP[r.assign_status] || r.assign_status}
          variant={r.assign_status === 'pending' ? 'warning' : 'success'}
        />
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
    ];
  }, [recycleDays]);

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await publicLeadsApi.remove(id);
        if (res.code === 0) {
          toast.success('删除成功');
          setDeleteId(null);
          table.refresh();
        } else {
          toast.error(res.message || '删除失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleBatchDelete = async () => {
    setBatchDeleteOpen(false);
    try {
      const res = await publicLeadsApi.batchDelete(selectedIds);
      if (res.code === 0) {
        toast.success(`成功删除 ${selectedNum} 条客资`);
        setSelectedKeys([]);
        table.refresh();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleClaim = async (id: number) => {
    await withOpLock(async () => {
      const vid = validateRecordId({ id });
      if (!vid) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await publicLeadsApi.claim(Number(vid));
        if (res.code === 0) {
          toast.success('领取成功');
          table.refresh();
        } else {
          toast.error(res.message || '领取失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleBatchClaim = async () => {
    if (selectedNum === 0) {
      toast.warning('请先选择客资');
      return;
    }
    try {
      const res = await publicLeadsApi.batchClaim(selectedIds);
      if (res.code === 0) {
        toast.success(`成功领取 ${selectedNum} 条客资`);
        setSelectedKeys([]);
        table.refresh();
      } else {
        toast.error(res.message || '领取失败');
      }
    } catch (e) {
      toast.error('批量领取失败');
    }
  };

  const openBatchAssign = () => {
    if (selectedNum === 0) {
      toast.warning('请先选择客资');
      return;
    }
    setAssignUserId('');
    loadUsers();
    setBatchAssignOpen(true);
  };

  const handleBatchAssign = async () => {
    await withOpLock(async () => {
      if (!assignUserId) {
        toast.warning('请选择分配对象');
        return;
      }
      if (selectedIds.length === 0) { toast.warning('请先选择客资'); return; }
      setBatchAssignOpen(false);
      try {
        const res = await publicLeadsApi.batchAssign(selectedIds, Number(assignUserId));
        if (res.code === 0) {
          const user = users.find((u) => u.id === Number(assignUserId));
          toast.success(`已将 ${selectedNum} 条客资分配给 ${user?.name || '负责人'}`);
          setSelectedKeys([]);
          table.refresh();
        } else {
          toast.error(res.message || '分配失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const openAutoAssign = async () => {
    setAutoAssignOpen(true);
    try {
      const res = await settingsApi.getGroup('public_sea');
      if (res.code === 0 && res.data) {
        setAutoRule(normalizeAssignRule((res.data as Record<string, string>).assign_rule));
      }
    } catch (e) {
      logger.warn('[public-sea] refresh assign rule failed', e);
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssignOpen(false);
    await withOpLock(async () => {
      try {
        const empRes = await employeesApi.list({ page: 1, pageSize: 200 });
        const empRows = ((empRes.data && empRes.data.list) || []) as Array<Record<string, unknown>>;
        const candidates: CandidateOwner[] = empRows
          .filter((e: Record<string, unknown>) => {
            const st = String(e.status || 'active');
            return st !== 'resigned' && st !== '离职';
          })
          .map((e: Record<string, unknown>) => ({
            name: String(e.name || '').trim(),
            department: String(e.department || '').trim(),
          }))
          .filter((e: CandidateOwner) => e.name);
        if (candidates.length === 0) {
          toast.error('暂无可参与分配的在职员工，请先在员工档案中维护');
          return;
        }
        const ordered = orderCandidates(candidates, autoRule);

        let targetRows: PublicLeadRow[] = [];
        if (selectedNum > 0) {
          targetRows = (table.data as PublicLeadRow[]).filter(
            (r) => selectedIds.includes(r.id) && r.assign_status === 'pending',
          );
        } else {
          const leadRes = await publicLeadsApi.list({ page: 1, pageSize: 200 });
          targetRows = (((leadRes.data && leadRes.data.list) || []) as PublicLeadRow[]).filter(
            (r) => r.assign_status === 'pending',
          );
        }
        if (targetRows.length === 0) {
          toast.warning('没有待分配的客资');
          return;
        }

        let okCount = 0;
        let failCount = 0;
        const failedNames: string[] = [];
        for (let i = 0; i < targetRows.length; i += 1) {
          const row = targetRows[i];
          const owner = ordered[i % ordered.length];
          try {
            const res = await publicLeadsApi.update(row.id, {
              owner_name: owner.name,
              assign_status: 'assigned',
            });
            if (res.code === 0) okCount += 1;
            else {
              failCount += 1;
              failedNames.push(row.entity_name);
            }
          } catch {
            failCount += 1;
            failedNames.push(row.entity_name);
          }
        }

        if (okCount > 0) {
          toast.success(`已按${ASSIGN_RULE_LABEL[autoRule]}分配 ${okCount} 条客资`);
        }
        if (failCount > 0) {
          const shown = failedNames.slice(0, 3).join('、');
          toast.error(`${failCount} 条客资写入负责人失败：${shown}${failedNames.length > 3 ? ' 等' : ''}`);
        }
        setSelectedKeys([]);
        table.refresh();
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const openImport = () => {
    setImportStage('idle');
    setImportResult(null);
    setImportOpen(true);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStage('parsing');
    setImportFileName(file.name.replace(/\.[^.]+$/, ''));
    // 模拟解析过程
    await new Promise((r) => setTimeout(r, 1200));
    const success = 3 + Math.floor(Math.random() * 3);
    const fail = 1;
    setImportResult({ success, fail });
    setImportStage('result');
    table.reload();
    // 清空 input 以允许重复选择
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportStage('idle');
    setImportResult(null);
  };

  const primaryActions: ActionButton[] = [
    { label: '新建', primary: true, icon: <Plus className="size-3.5" />, onClick: openCreate },
    { label: '批量导入', icon: <Upload className="size-3.5" />, onClick: openImport },
    { label: '批量领取', icon: <UserPlus className="size-3.5" />, onClick: handleBatchClaim },
    { label: '批量分配', icon: <Users className="size-3.5" />, onClick: openBatchAssign },
    { label: '自动分配', icon: <Shuffle className="size-3.5" />, onClick: openAutoAssign },
    { label: '批量删除', variant: 'outline', icon: <Trash2 className="size-3.5" />, onClick: () => {
      if (selectedNum === 0) { toast.warning('请先选择客资'); return; }
      setBatchDeleteOpen(true);
    }},
  ];

  const rowActions = (record: PublicLead): ActionButton[] => [
    { label: '领取', onClick: () => handleClaim(record.id) },
    { label: '分配', onClick: () => {
      setSelectedKeys([String(record.id)]);
      openBatchAssign();
    }},
    { label: '编辑', onClick: () => openEdit(record) },
    { label: '标记无效', variant: 'outline', onClick: () => handleMarkInvalid(record.id) },
    { label: '删除', variant: 'destructive', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<PublicLead>
        title={t('公海客资')}
        description={t('公海池中的客户资源，可领取或分配')}
        data={table.data as PublicLead[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={filterFields}
        primaryActions={primaryActions}
        rowActions={rowActions}
        selectable
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters}
        onReset={table.handleReset}
        onSort={table.handleSort}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onRefresh={table.refresh}
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
        emptyActionText="新建第一条客资"
        onEmptyAction={openCreate}
      />

      {/* 单条删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该客资吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">危险操作：批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除选中的 <span className="font-semibold text-destructive">{selectedNum}</span> 条客资吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBatchDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 自动分配确认 */}
      <AlertDialog open={autoAssignOpen} onOpenChange={setAutoAssignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>自动分配客资</AlertDialogTitle>
            <AlertDialogDescription>
              将按系统设置中的分配规则（{ASSIGN_RULE_LABEL[autoRule]}）把
              {selectedNum > 0 ? `选中的 ${selectedNum} 条待分配客资` : '所有待分配客资'}逐条分配给商务人员，是否继续？
            </AlertDialogDescription>
            <p className="text-xs text-muted-foreground">到期自动回收：规划中，当前仅作超期标记提示</p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoAssign}>开始自动分配</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量分配对话框 */}
      <Dialog open={batchAssignOpen} onOpenChange={setBatchAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量分配客资</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              已选择 <span className="font-semibold text-primary">{selectedNum}</span> 条客资，选择分配对象：
            </div>
            <div className="space-y-1.5">
              <Label>
                <span className="text-destructive">*</span> 分配给
              </Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择商务人员" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role === 'sales' || u.role?.includes('sale')).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} · {u.department}
                    </SelectItem>
                  ))}
                  {users.length > 0 && users.filter((u) => u.role === 'sales' || u.role?.includes('sale')).length === 0 && (
                    users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} · {u.department}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAssignOpen(false)}>取消</Button>
            <Button onClick={handleBatchAssign} disabled={!assignUserId}>确认分配</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入对话框 */}
      <Dialog open={importOpen} onOpenChange={closeImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量导入客资</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
                importStage === 'parsing' ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
              onClick={handleFileSelect}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div className="text-sm">
                {importStage === 'idle' && '点击或拖拽文件到此处上传'}
                {importStage === 'parsing' && '正在解析文件，请稍候...'}
                {importStage === 'result' && '解析完成'}
              </div>
              <div className="text-xs text-muted-foreground">支持 .xlsx / .xls / .csv 格式</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {importResult && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-green-700">{importResult.success}</div>
                  <div className="text-xs text-green-700/80">成功</div>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-red-600">{importResult.fail}</div>
                  <div className="text-xs text-red-600/80">失败</div>
                </div>
              </div>
            )}

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">导入说明</div>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>主体名称、客资分层为必填字段</li>
                <li>请使用标准模板，避免导入失败</li>
                <li>导入后客资将默认进入公海待分配状态</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="justify-between">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleDownloadTemplate}>
              <FileText className="size-3.5" /> 下载导入模板
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeImport}>关闭</Button>
              {importStage === 'result' && importResult && importResult.fail > 0 && (
                <Button variant="secondary" size="sm" className="gap-1" onClick={handleDownloadErrorReport}>
                  <Download className="size-3.5" /> 下载错误报告
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建/编辑客资弹窗（新建模式草稿自动保存） */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? '编辑公海客资' : '新建公海客资'}</DialogTitle>
            {!editingLead && draft.hasDraft && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Save className="size-3" />
                检测到未提交的草稿，已自动恢复并持续自动保存
              </p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>
                <span className="text-destructive">*</span> 主体名称
              </Label>
              <Input
                placeholder="请输入主体/公司名称"
                 value={form.entity_name}
                 onChange={(e) => setField({ entity_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                <span className="text-destructive">*</span> 客资分层
              </Label>
              <Select
               value={form.lead_level}
                 onValueChange={(v) => setField({ lead_level: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>一级行业</Label>
              <Select
                 value={form.primary_industry}
                 onValueChange={(v) => setField({ primary_industry: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>二级行业</Label>
              <Input
                placeholder="如：服饰内衣"
                 value={form.secondary_industry}
                 onChange={(e) => setField({ secondary_industry: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>客资来源</Label>
              <Select
                 value={form.source}
                 onValueChange={(v) => setField({ source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="官网">官网</SelectItem>
                  <SelectItem value="转介绍">转介绍</SelectItem>
                  <SelectItem value="广告投放">广告投放</SelectItem>
                  <SelectItem value="展会活动">展会活动</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Textarea
                placeholder="补充客资背景、诉求等信息"
                rows={3}
                  value={form.remark}
                  onChange={(e) => setField({ remark: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleValidate} disabled={submitting}>
              {submitting ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 标记无效对话框 */}
      <Dialog open={markInvalidOpen} onOpenChange={setMarkInvalidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>标记为无效客资</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                <span className="text-destructive">*</span> 无效原因
              </Label>
              <Select value={invalidReason} onValueChange={setInvalidReason}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择无效原因" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="电话空号">电话空号</SelectItem>
                  <SelectItem value="客户无投放意向">客户无投放意向</SelectItem>
                  <SelectItem value="资料不完整">资料不完整</SelectItem>
                  <SelectItem value="客户已停业">客户已停业</SelectItem>
                  <SelectItem value="重复客资">重复客资</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkInvalidOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={submitMarkInvalid}>确认标记</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提交前二次确认 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认提交</AlertDialogTitle>
            <AlertDialogDescription>
              将创建新的公海客资「{form.entity_name}」，提交后进入公海待分配状态，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>确认提交</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
