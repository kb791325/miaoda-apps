import { useState, useMemo, useEffect, useRef, Component, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Upload, Eye, X, ExternalLink, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// eslint-disable-next-line import/no-unresolved
import workerCode from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?raw';
import ServerListPage, { type FilterField as ServerFilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatDate, formatAmount } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { getCsrfToken, getResumeMime, fetchAttachmentBlob, fetchAttachmentArrayBuffer, downloadAttachment, buildAttachmentPermExtra } from '@/utils/attachment-utils';
import { employeesApi, resumesApi, performancesApi, attendancesApi, invitationsApi, interviewsApi, checkinsApi, recruitPlansApi, departmentsApi } from '@/api';
import PerformanceDialog from './PerformanceDialog';
import { useServerList } from '@/hooks/useServerList';
import type { Employee } from '@/api/types';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, CheckCircle2, XCircle, Users, UserCheck, UserX, CalendarDays, Target } from 'lucide-react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { Image } from '@client/src/components/ui/image';

// 员工管理（服务端数据）
const EMP_STATUS_OPTS = [
  { label: '在职', value: 'active' },
  { label: '试用', value: 'probation' },
  { label: '离职', value: 'resigned' },
];

const EMP_STATUS_MAP: Record<string, string> = {
  active: '在职',
  probation: '试用',
  resigned: '离职',
};

const EMP_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  probation: 'warning',
  resigned: 'danger',
};



export function EmployeePage() {
  const navigate = useNavigate();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Employee | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: employeesApi.list,
    defaultPageSize: 20,
  });

  const [deptOptions, setDeptOptions] = useState<{label: string, value: string}[]>([]);
  useEffect(() => {
    departmentsApi.list({ pageSize: 100 }).then((res: any) => {
      if (res.code === 0 && res.data?.list) {
        setDeptOptions(res.data.list.map((d: any) => ({ label: d.name, value: d.name })));
      }
    }).catch(() => {});
  }, []);

  const empFilters: ServerFilterField[] = useMemo(() => [
    { key: 'keyword', label: '姓名/工号', type: 'input', placeholder: '搜索姓名/工号/岗位' },
    { key: 'department', label: '部门', type: 'select', options: deptOptions },
    { key: 'status', label: '员工状态', type: 'select', options: EMP_STATUS_OPTS },
  ], [deptOptions]);

  const empFormFields: FormFieldDef[] = useMemo(() => [
    { key: 'name', label: '姓名', required: true, placeholder: '请输入员工姓名' },
    { key: 'gender', label: '性别', type: 'select', required: true, options: [
      { label: '男', value: '男' },
      { label: '女', value: '女' },
    ], defaultValue: '男' },
    { key: 'department', label: '部门', type: 'select', required: true, options: deptOptions, defaultValue: '商务一部' },
    { key: 'position', label: '岗位', required: true, placeholder: '如 商务专员' },
    { key: 'phone', label: '手机号', required: true, placeholder: '请输入手机号' },
    { key: 'email', label: '邮箱', placeholder: 'name@mutang.com（可选）' },
    { key: 'join_date', label: '入职日期', type: 'date', required: true },
    { key: 'contract_expire_date', label: '合同到期日', type: 'date' },
    { key: 'address', label: '居住地址', placeholder: '可选' },
    { key: 'status', label: '员工状态', type: 'select', required: true, options: EMP_STATUS_OPTS, defaultValue: 'active' },
  ], [deptOptions]);

  const columns: Column<Employee>[] = useMemo(() => [
    { key: 'employee_no', title: '工号', width: '100px', sortable: true, render: (r) => <>{r.employee_no || '-'}</> },
    {
      key: 'name', title: '姓名', width: '100px',
      render: (r) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hr/employees/${r.id}`);
          }}
        >
          {r.name}
        </button>
      ),
    },
    { key: 'department', title: '部门', width: '120px', render: (r) => <>{r.department || '-'}</> },
    { key: 'position', title: '岗位', width: '120px', render: (r) => <>{r.position || '-'}</> },
    { key: 'phone', title: '手机号', width: '140px', render: (r) => <span className="tabular-nums">{r.phone}</span> },
    {
      key: 'join_date', title: '入职日期', width: '120px',
      render: (r) => <span className="tabular-nums text-sm">{formatDate(r.join_date)}</span>,
    },
    {
      key: 'status', title: '员工状态', width: '100px',
      render: (r) => <StatusBadge status={EMP_STATUS_MAP[r.status] || r.status} variant={EMP_STATUS_VARIANT[r.status] || 'default'} />,
    },
    {
      key: 'created_at', title: '创建时间', width: '170px', sortable: true,
      render: (r) => <span className="text-muted-foreground tabular-nums text-sm">{formatDateTime(r.created_at)}</span>,
    },
  ], [navigate]);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await employeesApi.update(editRecord.id, values);
        if (res.code === 0) {
          toast.success('员工信息已更新');
          table.refresh();
          return true;
        }
        toast.error(res.message || '保存失败');
        return false;
      }
      const res = await employeesApi.create({
        ...values,
        employee_no: `MT${Date.now().toString().slice(-5)}`,
      });
      if (res.code === 0) {
        toast.success('员工创建成功');
        table.refresh();
        return true;
      }
      toast.error(res.message || '创建失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    } finally {
      setEditRecord(null);
    }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await employeesApi.remove(deleteId);
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

  const primaryActions: ActionButton[] = [
    { label: '新增员工', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '批量导入', onClick: () => navigate('/task/batch-import') },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('员工列表', [
        { key: 'employee_no', label: '工号' },
        { key: 'name', label: '姓名' },
        { key: 'department', label: '部门' },
        { key: 'position', label: '岗位' },
        { key: 'phone', label: '手机号' },
        { key: 'email', label: '邮箱' },
        { key: 'join_date', label: '入职日期' },
        { key: 'status', label: '状态' },
      ], table.data as Record<string, unknown>[]),
    },
  ];

  const rowActions = (record: Employee): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage
        title={t('员工管理')}
        description={t('管理公司员工信息')}
        data={table.data}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={empFilters}
        primaryActions={primaryActions}
        rowActions={rowActions}
        onRowClick={(record) => navigate(`/hr/employees/${record.id}`)}
        selectable
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
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
      />

      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editRecord ? `编辑员工：${editRecord.name}` : '新增员工'}
        description={t('录入员工信息，带 * 为必填项')}
        fields={empFormFields}
        submitLabel={editRecord ? '保存修改' : '确认新增'}
        onSubmit={handleSave}
        initialValues={editRecord}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该员工？</AlertDialogTitle>
            <AlertDialogDescription>删除后员工档案将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

class PreviewErrorBoundary extends Component<{ children: ReactNode; onError?: () => void }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
          <FileText className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">该文档预览失败，可下载查看</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function DocxPreviewer({ url, fileToken, extra }: { url: string; fileToken: string; extra?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cancelledRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setLoading(true);
    setError(null);
    cancelledRef.current = false;

    const mount = document.createElement('div');
    mountRef.current = mount;
    host.appendChild(mount);

    let cancelled = false;

    (async () => {
      try {
        const buf = await fetchAttachmentArrayBuffer(fileToken, extra);
        if (cancelledRef.current || cancelled) return;

        const { renderAsync } = await import('docx-preview');
        if (cancelledRef.current || cancelled) return;

        await renderAsync(buf, mount, undefined, {
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
        });
        if (cancelledRef.current || cancelled) return;

        setLoading(false);
      } catch (e: unknown) {
        if (cancelledRef.current || cancelled) return;
        setError(e instanceof Error ? e.message : '文档渲染失败');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      if (host) {
        host.innerHTML = '';
      }
      mountRef.current = null;
    };
  }, [fileToken, extra]);

  return (
    <div className="w-full min-h-[60vh] p-4 relative">
      <div ref={hostRef} className="w-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
          <FileText className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">该文档预览失败，可下载查看</p>
          <p className="text-xs text-muted-foreground max-w-md text-center">{error}</p>
          <Button variant="outline" onClick={() => downloadAttachment(fileToken, 'resume.docx', extra)}>
            <Download className="size-4 mr-1" />下载文件
          </Button>
        </div>
      )}
    </div>
  );
}

// ==================== 简历管理 ====================
const RESUME_STATUS_OPTS = [
  { label: '待筛选', value: 'pending_review' },
  { label: '已邀约', value: 'invited' },
  { label: '面试中', value: 'interviewing' },
  { label: '已录用', value: 'hired' },
  { label: '已拒绝', value: 'rejected' },
];
const RESUME_STATUS_MAP: Record<string, string> = { pending_review: '待筛选', invited: '已邀约', interviewing: '面试中', hired: '已录用', rejected: '已拒绝' };
const RESUME_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_review: 'info', invited: 'warning', interviewing: 'default', hired: 'success', rejected: 'danger',
};
const RESUME_SOURCE_OPTS = [
  { label: '猎聘', value: '猎聘' },
  { label: 'BOSS直聘', value: 'BOSS直聘' },
  { label: '智联招聘', value: '智联招聘' },
  { label: '58同城', value: '58同城' },
  { label: '内推', value: '内推' },
];
const RESUME_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '姓名/岗位', type: 'input', placeholder: '搜索姓名/岗位' },
  { key: 'status', label: '状态', type: 'select', options: RESUME_STATUS_OPTS },
  { key: 'source', label: '来源', type: 'select', options: RESUME_SOURCE_OPTS },
];
const RESUME_FORM: FormFieldDef[] = [
  { key: 'name', label: '姓名', required: true, placeholder: '请输入候选人姓名' },
  { key: 'position', label: '应聘岗位', required: true, placeholder: '如 商务专员' },
  { key: 'education', label: '学历', type: 'select', required: true, options: [
    { label: '大专', value: '大专' }, { label: '本科', value: '本科' },
    { label: '硕士', value: '硕士' }, { label: '博士', value: '博士' },
  ], defaultValue: '本科' },
  { key: 'work_years', label: '工作年限', required: true, placeholder: '如 3' },
  { key: 'source', label: '简历来源', type: 'select', required: true, options: RESUME_SOURCE_OPTS, defaultValue: 'BOSS直聘' },
  { key: 'status', label: '状态', type: 'select', required: true, options: RESUME_STATUS_OPTS, defaultValue: 'pending_review' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

let _pdfWorker: Worker | null = null;

function ensurePdfWorker(): void {
  if (_pdfWorker) return;
  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    _pdfWorker = new Worker(url, { type: 'module' });
    pdfjsLib.GlobalWorkerOptions.workerPort = _pdfWorker;
  } catch {
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      pdfjsLib.GlobalWorkerOptions.workerPort = null;
    } catch { /* 彻底无法初始化worker，pdf.js会fallback到主线程 */ }
  }
}

function PdfPreviewer({ fileToken, extra, fileName }: { fileToken: string; extra?: string; fileName: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setLoading(true);
    setError(null);
    setProgress(null);
    cancelledRef.current = false;

    let cancelled = false;

    (async () => {
      try {
        const buf = await fetchAttachmentArrayBuffer(fileToken, extra);
        if (cancelledRef.current || cancelled) return;

        ensurePdfWorker();

        const loadingTask = pdfjsLib.getDocument({ data: buf } as any);
        const pdfDoc: any = await loadingTask.promise;
        if (cancelledRef.current || cancelled) {
          pdfDoc.destroy();
          return;
        }
        pdfDocRef.current = pdfDoc;

        const totalPages = pdfDoc.numPages;
        const containerWidth = host.clientWidth || 700;
        const scale = (containerWidth - 32) / 612;

        const fragment = document.createDocumentFragment();
        const tasks: any[] = [];

        for (let i = 1; i <= totalPages; i++) {
          if (cancelledRef.current || cancelled) break;
          setProgress(`第 ${i} / 共 ${totalPages} 页`);

          const page = await pdfDoc.getPage(i);
          if (cancelledRef.current || cancelled) break;

          const viewport = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
          const canvas = document.createElement('canvas');
          canvas.className = 'block mx-auto mb-3 shadow-sm';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
          canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const renderTask = page.render({ canvasContext: ctx, viewport, canvas } as any);
          tasks.push(renderTask);

          try {
            await renderTask.promise;
          } catch {
            // 单页渲染失败不中断其他页
          }

          fragment.appendChild(canvas);
        }

        renderTasksRef.current = tasks;

        if (cancelledRef.current || cancelled) return;

        host.innerHTML = '';
        host.appendChild(fragment);
        setLoading(false);
        setProgress(null);
      } catch (e: unknown) {
        if (cancelledRef.current || cancelled) return;
        const msg = e instanceof Error ? e.message : 'PDF渲染失败';
        setError(msg);
        setLoading(false);
        setProgress(null);
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;

      for (const task of renderTasksRef.current) {
        try { task.cancel(); } catch { /* noop */ }
      }
      renderTasksRef.current = [];

      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch { /* noop */ }
        pdfDocRef.current = null;
      }

      if (host) {
        host.innerHTML = '';
      }
    };
  }, [fileToken, extra, fileName]);

  return (
    <div className="w-full min-h-[60vh] p-4 relative">
      <div ref={hostRef} className="w-full" />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 z-10 gap-2">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
          <FileText className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">该文档预览失败，可下载查看</p>
          <p className="text-xs text-muted-foreground max-w-md text-center">{error}</p>
          <Button variant="outline" onClick={() => downloadAttachment(fileToken, fileName || 'resume.pdf', extra)}>
            <Download className="size-4 mr-1" />下载文件
          </Button>
        </div>
      )}
    </div>
  );
}

function ImagePreviewer({ fileToken, extra, fileName }: { fileToken: string; extra?: string; fileName: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }

    fetchAttachmentArrayBuffer(fileToken, extra)
      .then((buf) => {
        if (!mountedRef.current) return;
        const mime = getResumeMime(fileName);
        const blob = new Blob([buf], { type: mime });
        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!mountedRef.current) return;
        const msg = e instanceof Error ? e.message : '未知错误';
        setError(msg);
        setLoading(false);
      });

    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, [fileToken, extra, fileName]);

  if (loading && !blobUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
        <FileText className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">图片加载失败</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{error}</p>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <Image src={blobUrl} alt={fileName} className="max-w-full max-h-[70vh] object-contain mx-auto" />;
}

async function uploadFileViaPlatform(file: File): Promise<{ downloadURL: string; fileName: string; size: number }> {
  const baseUrl = '/app/app_17czx1jrsqe/__runtime__/api/v1/studio/plugins/tmp_files';
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['x-suda-csrf-token'] = csrfToken;

  const acquireRes = await fetch(`${baseUrl}/acquire_upload_url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileName: file.name }),
    credentials: 'include',
  });
  if (!acquireRes.ok) throw new Error(`获取上传地址失败 (${acquireRes.status})`);
  const acquireData = await acquireRes.json();
  const upData = acquireData.data || acquireData;
  if (!upData.uploadURL || !upData.objectKey) {
    throw new Error('获取上传地址失败：缺少 uploadURL 或 objectKey');
  }

  const putRes = await fetch(upData.uploadURL, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!putRes.ok) throw new Error(`文件上传至存储失败 (${putRes.status})`);

  const dlRes = await fetch(`${baseUrl}/acquire_download_url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ objectKey: upData.objectKey }),
    credentials: 'include',
  });
  if (!dlRes.ok) throw new Error(`获取下载链接失败 (${dlRes.status})`);
  const dlData = await dlRes.json();
  const dlResult = dlData.data || dlData;
  if (!dlResult.downloadURL) throw new Error('获取下载链接失败：缺少 downloadURL');

  return { downloadURL: dlResult.downloadURL, fileName: file.name, size: file.size };
}

export function ResumePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const table = useServerList({ fetchFn: resumesApi.list, defaultPageSize: 20 });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removedAttachment, setRemovedAttachment] = useState(false);
  const [existingAttachment, setExistingAttachment] = useState<{ name: string; size: number; type: string; tmp_url?: string } | null>(null);
  const [previewRecord, setPreviewRecord] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (formOpen) {
      if (editRecord) {
        const att = editRecord.attachment;
        if (att && Array.isArray(att) && att.length > 0) {
          setExistingAttachment(att[0]);
        } else {
          setExistingAttachment(null);
        }
      } else {
        setExistingAttachment(null);
      }
      setPendingFile(null);
      setRemovedAttachment(false);
    }
  }, [formOpen, editRecord]);

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'resume_no', title: '简历ID', width: '110px', sortable: true, render: (r) => <>{r.resume_no || '-'}</> },
    { key: 'name', title: '姓名', width: '100px', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'position', title: '应聘岗位', width: '130px', render: (r) => <>{r.position || '-'}</> },
    { key: 'education', title: '学历', width: '80px', render: (r) => <>{r.education || '-'}</> },
    { key: 'work_years', title: '工作年限', width: '90px', align: 'right', render: (r) => <span className="tabular-nums">{r.work_years} 年</span> },
    { key: 'source', title: '来源', width: '100px', render: (r) => <>{r.source || '-'}</> },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={RESUME_STATUS_MAP[r.status] || r.status} variant={RESUME_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'attachment', title: '简历附件', width: '180px', render: (r) => {
      const attachments = r.attachment;
      if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }
      const first = attachments[0];
      return (
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate text-sm max-w-[100px]">{first.name || '附件'}</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-primary" onClick={() => setPreviewRecord(r)}>
            预览
          </Button>
        </div>
      );
    } },
    { key: 'created_at', title: '创建时间', width: '160px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data: Record<string, any> = { ...values, work_years: Number(values.work_years) || 0 };
    try {
      if (pendingFile) {
        setUploading(true);
        const { downloadURL, fileName, size } = await uploadFileViaPlatform(pendingFile);
        const uploadRes = await axiosForBackend.post('/api/upload/from-url', {
          url: downloadURL,
          fileName,
          size,
        });
        const fileToken = uploadRes.data?.data?.file_token || uploadRes.data?.file_token;
        if (fileToken) {
          data.attachment = [fileToken];
        } else {
          toast.error(uploadRes.data?.message || '文件上传失败');
          return false;
        }
      } else if (removedAttachment) {
        data.attachment = [];
      }
      if (editRecord) {
        const res = await resumesApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('简历信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await resumesApi.create({ ...data, resume_no: `JL${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('简历录入成功'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await resumesApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('简历管理')} description={t('管理招聘简历和应聘人员')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={RESUME_FILTERS}
        primaryActions={[
          { label: '新增简历', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => [
          { label: '预览简历', onClick: () => {
            const att = r.attachment;
            if (att && Array.isArray(att) && att.length > 0 && att[0].file_token) {
              setPreviewRecord(r);
            } else {
              toast.warning('该候选人暂未上传简历附件');
            }
          } },
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑简历：${editRecord.name}` : '新增简历'}
        description={t('录入候选人简历信息，带 * 为必填项')}
        fields={RESUME_FORM} submitLabel={editRecord ? '保存修改' : '确认录入'}
        onSubmit={handleSave} initialValues={editRecord}
      >
        <div className="border rounded-lg p-4 space-y-2">
          <Label className="text-sm font-medium">简历附件</Label>
          {existingAttachment && !pendingFile && !removedAttachment ? (
            <div className="flex items-center gap-2 py-1">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate max-w-[200px]">{existingAttachment.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(existingAttachment.size)})</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => { setRemovedAttachment(true); setExistingAttachment(null); }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : pendingFile ? (
            <div className="flex items-center gap-2 py-1">
              <FileText className="size-4 text-primary shrink-0" />
              <span className="text-sm truncate max-w-[200px]">{pendingFile.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(pendingFile.size)})</span>
              {uploading ? (
                <Loader2 className="size-4 animate-spin shrink-0" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => setPendingFile(null)}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <Label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg hover:border-primary hover:bg-accent/50 transition-colors w-full justify-center">
              <Upload className="size-4" />
              <span className="text-sm text-muted-foreground">上传简历文件（PDF / DOC / DOCX，≤20MB）</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
                    toast.error('仅支持 PDF、DOC、DOCX 格式的文件');
                    return;
                  }
                  if (file.size > 20 * 1024 * 1024) {
                    toast.error('文件大小不能超过 20MB');
                    return;
                  }
                  setPendingFile(file);
                  setRemovedAttachment(false);
                  setExistingAttachment(null);
                }}
              />
            </Label>
          )}
        </div>
      </FieldFormDialog>
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该简历？</AlertDialogTitle>
            <AlertDialogDescription>删除后简历记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={previewRecord !== null} onOpenChange={(o) => !o && setPreviewRecord(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>简历附件预览</DialogTitle>
            <DialogDescription>
              {previewRecord?.name} — {previewRecord?.attachment?.[0]?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-[60vh] overflow-auto">
            <PreviewErrorBoundary>
            {previewRecord && (() => {
              const att = previewRecord.attachment?.[0];
              if (!att?.file_token) {
                return <div className="flex items-center justify-center h-full text-muted-foreground">无可预览的附件</div>;
              }
              const fileToken: string = att.file_token;
              const fileName: string = att.name || '';
              const loName = fileName.toLowerCase();
              const extra = buildAttachmentPermExtra('tblf0KM73YmFcTsb');
              const isPdf = att.type === 'application/pdf' || loName.endsWith('.pdf');
              const isDocx = att.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                || loName.endsWith('.docx');
              const isDoc = !isDocx && (att.type === 'application/msword' || loName.endsWith('.doc'));
              const isImage = /\.(png|jpe?g|gif|webp)$/i.test(fileName);
              if (isPdf) {
                return <PdfPreviewer fileToken={fileToken} extra={extra} fileName={fileName} />;
              }
              if (isDocx || isDoc) {
                return <DocxPreviewer url={att.tmp_url || ''} fileToken={fileToken} extra={extra} />;
              }
              if (isImage) {
                return <ImagePreviewer fileToken={fileToken} extra={extra} fileName={fileName} />;
              }
              return (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                  <FileText className="size-12 text-muted-foreground" />
                  <p className="text-muted-foreground">此文件类型不支持在线预览</p>
                  <Button variant="outline" onClick={() => downloadAttachment(fileToken, att.name || 'file', extra)}>
                    <Download className="size-4 mr-1" />下载文件
                  </Button>
                </div>
              );
            })()}
            </PreviewErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== 绩效管理 ====================
const PERF_GRADE_OPTS = ['A', 'B', 'C', 'D'].map((g) => ({ label: g, value: g }));
const PERF_GRADE_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  A: 'success', B: 'info', C: 'warning', D: 'danger',
};
const PERF_STATUS_OPTS = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
];
const PERF_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '姓名/部门', type: 'input', placeholder: '搜索员工姓名/部门' },
  { key: 'grade', label: '等级', type: 'select', options: PERF_GRADE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: PERF_STATUS_OPTS },
];
const PERF_FORM: FormFieldDef[] = [];
void PERF_FORM;

export function PerformancePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const table = useServerList({ fetchFn: performancesApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'performance_no', title: '考核ID', width: '110px', render: (r) => <>{r.performance_no || '-'}</> },
    { key: 'employee_name', title: '员工姓名', width: '100px', render: (r) => <span className="font-medium">{r.employee_name}</span> },
    { key: 'department', title: '部门', width: '110px', render: (r) => <>{r.department || '-'}</> },
    { key: 'period', title: '考核周期', width: '100px', render: (r) => <>{r.period || '-'}</> },
    { key: 'mode', title: '绩效模式', width: '90px', render: (r) => <>{r.mode || '-'}</> },
    { key: 'score', title: '考核得分', width: '90px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.score !== undefined && r.score !== null && r.score !== '' ? Number(r.score).toFixed(2) : '-'}</span> },
    { key: 'calc_perf_salary', title: '核算绩效工资', width: '110px', align: 'right', render: (r) => <span className="tabular-nums">{r.calc_perf_salary !== undefined && r.calc_perf_salary !== null && r.calc_perf_salary !== '' ? formatAmount(r.calc_perf_salary) : '-'}</span> },
    { key: 'grade', title: '等级', width: '80px', render: (r) => <StatusBadge status={r.grade} variant={PERF_GRADE_VARIANT[r.grade] || 'default'} /> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={r.status === 'confirmed' ? '已确认' : '待确认'} variant={r.status === 'confirmed' ? 'success' : 'warning'} /> },
  ], []);


  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await performancesApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('绩效管理')} description={t('管理员工绩效考核')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={PERF_FILTERS}
        primaryActions={[
          { label: '发起考核', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: r.status === 'confirmed' ? '取消确认' : '确认', onClick: () => withOpLock(async () => {
            const recordId = validateRecordId({ id: r.id });
            if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
            const next = r.status === 'confirmed' ? 'pending' : 'confirmed';
            try {
              const res = await performancesApi.update(r.id, { status: next });
              if (res.code === 0) { toast.success(next === 'confirmed' ? '已确认绩效结果' : '已取消确认'); table.refresh(); }
              else toast.error(res.message || '操作失败');
            } catch (e) { toast.error(extractErrorMessage(e)); }
          }) },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <PerformanceDialog
        open={formOpen} onOpenChange={setFormOpen}
        editing={editRecord}
        onSaved={() => table.refresh()}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该考核记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后考核记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 考勤管理 ====================
const ATT_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '姓名/部门', type: 'input', placeholder: '搜索员工姓名/部门' },
  { key: 'attend_month', label: '考勤月份', type: 'input', placeholder: '如 2026-08' },
];
const ATT_FORM: FormFieldDef[] = [
  { key: 'employee_name', label: '员工姓名', required: true, placeholder: '请输入员工姓名' },
  { key: 'department', label: '部门', required: true, placeholder: '如 商务一部' },
  { key: 'attend_month', label: '考勤月份', required: true, placeholder: '如 2026-08' },
  { key: 'work_days', label: '出勤天数', required: true, placeholder: '如 21' },
  { key: 'late_count', label: '迟到次数', placeholder: '默认 0' },
  { key: 'early_count', label: '早退次数', placeholder: '默认 0' },
  { key: 'leave_days', label: '请假天数', placeholder: '默认 0' },
  { key: 'overtime_hours', label: '加班时长（小时）', placeholder: '默认 0' },
];

export function AttendancePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const table = useServerList({ fetchFn: attendancesApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'attendance_no', title: '记录ID', width: '110px', render: (r) => <>{r.attendance_no || '-'}</> },
    { key: 'employee_name', title: '员工姓名', width: '100px', render: (r) => <span className="font-medium">{r.employee_name}</span> },
    { key: 'department', title: '部门', width: '110px', render: (r) => <>{r.department || '-'}</> },
    { key: 'attend_month', title: '考勤月份', width: '100px', render: (r) => <>{r.attend_month || '-'}</> },
    { key: 'work_days', title: '出勤天数', width: '90px', align: 'right', sortable: true, render: (r) => <span className="tabular-nums">{r.work_days}</span> },
    { key: 'late_count', title: '迟到', width: '70px', align: 'right', render: (r) => <span className={r.late_count > 0 ? 'text-destructive tabular-nums font-medium' : 'tabular-nums'}>{r.late_count}</span> },
    { key: 'early_count', title: '早退', width: '70px', align: 'right', render: (r) => <span className={r.early_count > 0 ? 'text-destructive tabular-nums font-medium' : 'tabular-nums'}>{r.early_count}</span> },
    { key: 'leave_days', title: '请假(天)', width: '90px', align: 'right', render: (r) => <span className="tabular-nums">{r.leave_days}</span> },
    { key: 'overtime_hours', title: '加班(h)', width: '90px', align: 'right', sortable: true, render: (r) => <span className="tabular-nums">{r.overtime_hours}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      work_days: Number(values.work_days) || 0,
      late_count: Number(values.late_count) || 0,
      early_count: Number(values.early_count) || 0,
      leave_days: Number(values.leave_days) || 0,
      overtime_hours: Number(values.overtime_hours) || 0,
    };
    try {
      if (editRecord) {
        const res = await attendancesApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('考勤记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await attendancesApi.create({ ...data, attendance_no: `AT${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('考勤登记成功'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await attendancesApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('考勤管理')} description={t('管理员工考勤记录')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={ATT_FILTERS}
        primaryActions={[
          { label: '登记考勤', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑考勤：${editRecord.employee_name}` : '登记考勤'}
        description={t('录入员工考勤数据，带 * 为必填项')}
        fields={ATT_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该考勤记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后考勤记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 邀约管理 ====================
const INV_STATUS_OPTS = [
  { label: '待确认', value: 'pending_confirm' },
  { label: '已接受', value: 'accepted' },
  { label: '已拒绝', value: 'declined' },
  { label: '已过期', value: 'expired' },
];
const INV_STATUS_MAP: Record<string, string> = {
  pending_confirm: '待确认', accepted: '已接受', declined: '已拒绝', expired: '已过期',
};
const INV_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_confirm: 'warning', accepted: 'success', declined: 'danger', expired: 'default',
};
const INV_CHANNEL_OPTS = [
  { label: 'BOSS直聘', value: 'BOSS直聘' },
  { label: '猎聘', value: '猎聘' },
  { label: '智联招聘', value: '智联招聘' },
  { label: '58同城', value: '58同城' },
  { label: '内推', value: '内推' },
  { label: '电话邀约', value: '电话邀约' },
];
const INV_MODE_OPTS = [
  { label: '现场', value: 'onsite' },
  { label: '视频', value: 'video' },
  { label: '电话', value: 'phone' },
];
const INV_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '候选人/岗位', type: 'input', placeholder: '搜索候选人/岗位' },
  { key: 'status', label: '状态', type: 'select', options: INV_STATUS_OPTS },
  { key: 'channel', label: '渠道', type: 'select', options: INV_CHANNEL_OPTS },
  { key: 'interviewer_name', label: '面试官', type: 'input', placeholder: '面试官姓名' },
];
const INV_FORM: FormFieldDef[] = [
  { key: 'candidate_name', label: '候选人姓名', required: true, placeholder: '请输入候选人姓名' },
  { key: 'position', label: '应聘岗位', required: true, placeholder: '如 商务专员' },
  { key: 'phone', label: '手机号', required: true, placeholder: '请输入手机号' },
  { key: 'channel', label: '邀约渠道', type: 'select', required: true, options: INV_CHANNEL_OPTS, defaultValue: 'BOSS直聘' },
  { key: 'interviewer_name', label: '面试官', required: true, placeholder: '如 张伟' },
  { key: 'interview_time', label: '面试时间', type: 'datetime', required: true },
  { key: 'interview_mode', label: '面试形式', type: 'select', required: true, options: INV_MODE_OPTS, defaultValue: 'onsite' },
  { key: 'location', label: '面试地点', required: true, placeholder: '如 总部3楼会议室A' },
  { key: 'status', label: '状态', type: 'select', required: true, options: INV_STATUS_OPTS, defaultValue: 'pending_confirm' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export function InvitationPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record<string, any> | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: number; status: string } | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const table = useServerList({ fetchFn: invitationsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'invitation_no', title: '邀约ID', width: '110px', sortable: true, render: (r) => <>{r.invitation_no || '-'}</> },
    { key: 'candidate_name', title: '候选人', width: '100px', render: (r) => <span className="font-medium">{r.candidate_name}</span> },
    { key: 'position', title: '应聘岗位', width: '120px', render: (r) => <>{r.position || '-'}</> },
    { key: 'phone', title: '手机号', width: '130px', render: (r) => <span className="tabular-nums text-sm">{r.phone || '-'}</span> },
    { key: 'channel', title: '渠道', width: '100px', render: (r) => <>{r.channel || '-'}</> },
    { key: 'interview_time', title: '面试时间', width: '160px', sortable: true, render: (r) => <span className="tabular-nums text-sm">{formatDateTime(r.interview_time)}</span> },
    { key: 'location', title: '地点', width: '150px', render: (r) => <span className="text-sm">{r.location}</span> },
    { key: 'interviewer_name', title: '面试官', width: '90px', render: (r) => <>{r.interviewer_name || '-'}</> },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={INV_STATUS_MAP[r.status] || r.status} variant={INV_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await invitationsApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('邀约已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await invitationsApi.create(values);
      if (res.code === 0) { toast.success('邀约已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await invitationsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const handleConfirm = async (remark?: string) => {
    await withOpLock(async () => {
      if (!confirmDialog) return;
      const recordId = validateRecordId({ id: confirmDialog.id });
      if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); setConfirmDialog(null); return; }
      try {
        const res = await invitationsApi.confirm(confirmDialog.id, confirmDialog.status, remark);
        if (res.code === 0) {
          toast.success(confirmDialog.status === 'accepted' ? '已确认接受' : '已更新状态');
          table.refresh();
        } else toast.error(res.message || '操作失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
      finally { setConfirmDialog(null); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('邀约管理')} description={t('管理面试邀约记录和候选人沟通')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={INV_FILTERS}
        primaryActions={[
          { label: '新建邀约', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => {
          const actions: ServerFilterField extends any ? any[] : never = [
            { label: '查看详情', onClick: () => { setDetailRecord(r); setDetailOpen(true); } },
          ];
          if (r.status === 'pending_confirm') {
            actions.push(
              { label: '确认接受', onClick: () => setConfirmDialog({ id: r.id, status: 'accepted' }) },
              { label: '标记拒绝', variant: 'destructive' as const, onClick: () => setConfirmDialog({ id: r.id, status: 'declined' }) },
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
        title={editRecord ? `编辑邀约：${editRecord.candidate_name}` : '新建面试邀约'}
        description={t('录入面试邀约信息，带 * 为必填项')}
        fields={INV_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该邀约？</AlertDialogTitle>
            <AlertDialogDescription>删除后邀约记录将不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 状态确认对话框 */}
      <ConfirmRemarkDialog
        open={!!confirmDialog}
        onOpenChange={(o) => !o && setConfirmDialog(null)}
        title={confirmDialog?.status === 'accepted' ? '确认候选人接受邀约？' : '确认候选人拒绝邀约？'}
        placeholder="请输入备注（可选）"
        onConfirm={handleConfirm}
      />

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>邀约详情</DialogTitle>
            <DialogDescription>邀约ID：{detailRecord?.invitation_no}</DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">候选人：</span><span className="font-medium">{detailRecord.candidate_name}</span></div>
                <div><span className="text-muted-foreground">应聘岗位：</span>{detailRecord.position}</div>
                <div><span className="text-muted-foreground">手机号：</span><span className="tabular-nums">{detailRecord.phone}</span></div>
                <div><span className="text-muted-foreground">渠道：</span>{detailRecord.channel}</div>
                <div><span className="text-muted-foreground">面试官：</span>{detailRecord.interviewer_name}</div>
                <div><span className="text-muted-foreground">形式：</span>{INV_MODE_OPTS.find(o => o.value === detailRecord.interview_mode)?.label || detailRecord.interview_mode}</div>
                <div className="col-span-2"><span className="text-muted-foreground">面试时间：</span>{formatDateTime(detailRecord.interview_time)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">地点：</span>{detailRecord.location}</div>
                <div><span className="text-muted-foreground">状态：</span><StatusBadge status={INV_STATUS_MAP[detailRecord.status] || detailRecord.status} variant={INV_STATUS_VARIANT[detailRecord.status] || 'default'} /></div>
              </div>
              {detailRecord.remark && (
                <div className="text-sm"><div className="text-muted-foreground mb-1">备注：</div><div className="bg-muted/50 p-3 rounded-lg">{detailRecord.remark}</div></div>
              )}
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

// 备注确认对话框
function ConfirmRemarkDialog({ open, onOpenChange, title, placeholder, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; placeholder: string; onConfirm: (remark?: string) => void;
}) {
  const [remark, setRemark] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setRemark(''); onOpenChange(false); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="confirm-remark">备注说明</Label>
          <Textarea id="confirm-remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={placeholder} className="mt-1.5" rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setRemark(''); onOpenChange(false); }}>取消</Button>
          <Button onClick={() => { const r = remark.trim() || undefined; setRemark(''); onConfirm(r); }}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
