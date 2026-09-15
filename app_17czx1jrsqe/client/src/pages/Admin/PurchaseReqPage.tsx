import { useCallback, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import { useActionLock } from '@/hooks/useActionLock';
import { useExport } from '@/hooks/useExport';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { runBatch, reportBatchResult } from '@/utils/batch-run';
import { BatchDeleteDialog } from '@/components/BatchDeleteDialog';
import { ExportButton } from '@/components/ExportButton';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';

type PurchaseItemView = { name: string; spec?: string; quantity: number; unit_price: number; subtotal?: number };

function safeItems(items: unknown): PurchaseItemView[] {
  let arr: unknown[] = [];
  if (Array.isArray(items)) arr = items;
  else if (typeof items === 'string' && items.length > 0) {
    try {
      const parsed: unknown = JSON.parse(items);
      if (Array.isArray(parsed)) arr = parsed;
    } catch { arr = []; }
  }
  return arr.map((raw): PurchaseItemView => {
    const it = raw as Record<string, unknown>;
    const quantity = Number(it.quantity ?? it.qty ?? 0) || 0;
    const unit_price = Number(it.unit_price ?? it.price ?? 0) || 0;
    return {
      name: String(it.name ?? it.item ?? ''),
      spec: it.spec == null ? undefined : String(it.spec),
      quantity,
      unit_price,
      subtotal: Number(it.subtotal ?? quantity * unit_price),
    };
  });
}
import { useServerList } from '@/hooks/useServerList';
import { useApp } from '@/context/AppContext';
import { approvalsApi } from '@/api';
import StatusBadge from '@/components/StatusBadge';
import AmountDisplay from '@/components/AmountDisplay';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import { Button } from '@/components/ui/button';
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
import { purchaseReqsApi } from '@/api';
import { formatDateTime, formatAmount } from '@/lib/format';
import type { PurchaseRequisition } from '@/api/types';
import PurchaseFormDialog from './PurchaseFormDialog';
import PurchaseDetailDialog from './PurchaseDetailDialog';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待审批', value: '待审批' },
  { label: '审批中', value: '审批中' },
  { label: '已通过', value: '已通过' },
  { label: '已驳回', value: '已驳回' },
  { label: '已采购', value: '已采购' },
];

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  '待审批': 'warning',
  '审批中': 'info',
  '已通过': 'success',
  '已驳回': 'danger',
  '已采购': 'default',
};

const PURCHASE_FLOW_TYPES = ['采购申请', '采购'];

function toTimelineSteps(record: PurchaseRequisition, flow: { instance: any; steps: any[] } | null): ApprovalStep[] {
  const submitStep: ApprovalStep = {
    id: 0,
    step_name: '提交申请',
    approver_name: record.applicant_name || '申请人',
    status: 'approved',
    comment: '提交采购申请',
    approved_at: record.created_at,
    is_submit: true,
  };
  if (!flow?.instance || !flow.steps?.length) return [submitStep];
  let firstPending = true;
  const steps = flow.steps.map((s: any, idx: number): ApprovalStep => {
    let status: ApprovalStep['status'] = 'pending';
    if (s.status === '已通过') status = 'approved';
    else if (s.status === '已驳回') status = 'rejected';
    else if (s.status === '待审批') { status = firstPending ? 'current' : 'pending'; firstPending = false; }
    return {
      id: idx + 1,
      step_name: s.step_name || `审批步骤${idx + 1}`,
      approver_name: s.approver_name || '审批人',
      status,
      comment: s.comment || '',
      approved_at: s.approved_at || '',
    };
  });
  return [submitStep, ...steps];
}

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '关键字', type: 'input', placeholder: '申请事由/申请人/申请编号' },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTIONS },
  { key: 'department', label: '部门', type: 'input', placeholder: '部门' },
];

export default function PurchaseReqPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const table = useServerList({
    fetchFn: purchaseReqsApi.list,
    defaultPageSize: 20,
  });
  const { exporting, exportAs } = useExport({ fetchFn: purchaseReqsApi.list, filename: '采购申请' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PurchaseRequisition | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<PurchaseRequisition | null>(null);
  const [approveRecord, setApproveRecord] = useState<PurchaseRequisition | null>(null);
  const [approving, setApproving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveFlow, setApproveFlow] = useState<{ instance: any; steps: any[] } | null>(null);
  const [detailFlow, setDetailFlow] = useState<{ instance: any; steps: any[] } | null>(null);

  const loadFlow = useCallback(async (r: PurchaseRequisition) => {
    try {
      const res = await approvalsApi.getBusinessFlow(PURCHASE_FLOW_TYPES, [r.id, r.req_no]);
      return res?.code === 0 ? (res.data as { instance: any; steps: any[] }) : null;
    } catch {
      return null;
    }
  }, []);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const isApprover = useMemo(() => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager';
  }, [user]);

  const canApprove = (record: PurchaseRequisition) => {
    if (!isApprover) return false;
    if (record.status === '待审批') return true;
    if (record.status === '审批中') return user?.role === 'admin';
    return false;
  };

  const canEdit = (record: PurchaseRequisition) => {
    return record.status === '待审批' || record.status === '已驳回';
  };

  const canDelete = (record: PurchaseRequisition) => {
    return record.status === '待审批' || record.status === '已驳回';
  };

  const handleSave = async (values: Record<string, unknown>) => {
    if (editRecord) {
      const id = validateRecordId(editRecord);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return false; }
      try {
        const res = await purchaseReqsApi.update(id, {
          reason: values.reason,
          items: values.items,
          total_amount: values.total_amount,
          expected_date: values.expectedDate || undefined,
          remark: values.remark || undefined,
        });
        if (res.code === 0) { toast.success('采购申请已更新'); setEditRecord(null); setFormOpen(false); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      } catch (e) { toast.error(extractErrorMessage(e)); return false; }
    }
    return true;
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await purchaseReqsApi.remove(id);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const handleView = (record: PurchaseRequisition) => {
    setCurrentRecord(record);
    setDetailOpen(true);
    setDetailFlow(null);
    loadFlow(record).then(setDetailFlow);
  };

  const handleEdit = (record: PurchaseRequisition) => {
    setEditRecord(record);
    setFormOpen(true);
  };

  // 无审批实例时的兜底展示步骤
  const genApprovalSteps = (record: PurchaseRequisition): ApprovalStep[] => {
    const amount = record.total_amount || 0;
    const needLevel2 = amount >= 5000;
    const steps: ApprovalStep[] = [
      {
        id: 0,
        step_name: '提交申请',
        approver_name: record.applicant_name || '申请人',
        status: 'approved',
        comment: '提交采购申请',
        approved_at: record.created_at,
        is_submit: true,
      },
      {
        id: 1,
        step_name: '部门经理审批',
        approver_name: '李娜（商务经理）',
        status: 'pending',
      },
    ];
    if (needLevel2) {
      steps.push({
        id: 2,
        step_name: '总经理审批',
        approver_name: '王总',
        status: 'pending',
        condition_text: '金额≥5000元，触发二级审批',
      });
    }
    // 按状态流转（中文直存）
    if (record.status === '待审批') {
      steps[1].status = 'current';
    } else if (record.status === '审批中') {
      steps[1].status = 'approved';
      steps[1].approved_at = record.updated_at;
      if (steps[2]) steps[2].status = 'current';
    } else if (record.status === '已通过' || record.status === '已采购') {
      steps[1].status = 'approved';
      steps[1].approved_at = record.updated_at;
      if (steps[2]) {
        steps[2].status = 'approved';
        steps[2].approved_at = record.updated_at;
      }
    } else if (record.status === '已驳回') {
      steps[1].status = 'rejected';
      steps[1].approved_at = record.updated_at;
    }
    return steps;
  };

  const approvalSummary = useMemo<ApprovalSummaryField[]>(() => {
    if (!approveRecord) return [];
    return [
      { label: '业务类型', value: '采购申请' },
      { label: '单据编号', value: approveRecord.req_no },
      { label: '申请人', value: approveRecord.applicant_name || '-' },
      { label: '申请部门', value: approveRecord.department || '-' },
      { label: '申请时间', value: formatDateTime(approveRecord.created_at) },
      { label: '预计金额', value: <span className="font-semibold text-primary tabular-nums">{formatAmount(approveRecord.total_amount)}</span> },
      { label: '物品数量', value: `${safeItems(approveRecord.items).length} 项` },
    ];
  }, [approveRecord]);

  const approvalSteps = useMemo<ApprovalStep[]>(() => {
    if (!approveRecord) return [];
    return toTimelineSteps(approveRecord, approveFlow);
  }, [approveRecord, approveFlow]);

  const approveStatusVariant = useMemo(() => {
    if (!approveRecord) return 'default' as const;
    const s = approveRecord.status;
    if (s === '已通过' || s === '已采购') return 'success' as const;
    if (s === '已驳回') return 'destructive' as const;
    return 'warning' as const;
  }, [approveRecord]);

  const handleApproveAction = async (type: 'approve' | 'reject', comment: string): Promise<boolean> => {
    if (!approveRecord) return false;
    const id = validateRecordId(approveRecord);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return false; }
    setApproving(true);
    try {
      let flow = approveFlow;
      if (!flow?.instance) {
        try { await purchaseReqsApi.submit(id); } catch { /* 实例可能已存在，继续解析 */ }
        flow = await loadFlow(approveRecord);
      }
      const instanceId = flow?.instance?.id;
      if (!instanceId) { toast.error('未找到审批实例，无法推进'); return false; }
      const res = type === 'approve'
        ? await approvalsApi.approve(instanceId, comment || '')
        : await approvalsApi.reject(instanceId, comment || '');
      if (res.code === 0) {
        toast.success(type === 'approve' ? '审批通过' : '已驳回');
        setApproveRecord(null);
        table.reload();
        return true;
      }
      toast.error(res.message || '操作失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    } finally {
      setApproving(false);
    }
  };

  const currentStepName = useMemo(() => {
    const cur = approvalSteps.find(s => s.status === 'current');
    return cur?.step_name || '';
  }, [approvalSteps]);

  const handleCreateSuccess = () => {
    setFormOpen(false);
    table.reload();
  };

  const handleGenerateOrder = async (record: PurchaseRequisition) => {
    const id = validateRecordId(record);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
    try {
      const res = await purchaseReqsApi.generateOrder(id);
      if (res.code === 0) {
        toast.success('采购订单已生成');
        table.reload();
        setDetailOpen(false);
        navigate('/admin/purchase-order');
      } else {
        toast.error(res.message || '生成失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  };

  const columns: Column<PurchaseRequisition>[] = useMemo(() => [
    { key: 'req_no', title: '申请编号', dataIndex: 'req_no' as const, width: '140px', render: (r) => r.req_no || '-' },
    {
      key: 'reason',
      title: '申请事由',
      dataIndex: 'reason' as const,
      render: (r) => <span className="font-medium">{r.reason}</span>,
    },
    { key: 'applicant_name', title: '申请人', dataIndex: 'applicant_name' as const, width: '90px', render: (r) => r.applicant_name || '-' },
    { key: 'department', title: '部门', dataIndex: 'department' as const, width: '120px', render: (r) => r.department || '-' },
    {
      key: 'item_summary',
      title: '采购物品明细',
      width: '200px',
      render: (r) => {
        const items = safeItems(r.items);
        return (
        <span className="text-muted-foreground">
          {items.length} 项 / 共 {items.reduce((s: number, i: PurchaseItemView) => s + i.quantity, 0)} 件
        </span>
        );
      },
    },
    {
      key: 'total_amount',
      title: '预计金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <AmountDisplay value={r.total_amount} />,
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => (
        <StatusBadge status={r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
      ),
    },
    {
      key: 'created_at',
      title: '申请时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      render: (r) => formatDateTime(r.created_at) || '-',
    },
    {
      key: 'actions',
      title: '操作',
      width: '280px',
      render: (r) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(r)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            详情
          </Button>
          {canEdit(r) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(r)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              编辑
            </Button>
          )}
          {canDelete(r) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => setDeleteId(r.id)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              删除
            </Button>
          )}
          {canApprove(r) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80"
              onClick={() => { setApproveRecord(r); setApproveFlow(null); loadFlow(r).then(setApproveFlow); }}
            >
              审批
            </Button>
          )}
          {['已通过', '已驳回', '已采购'].includes(r.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setApproveRecord(r); setApproveFlow(null); loadFlow(r).then(setApproveFlow); }}
            >
              查看审批
            </Button>
          )}
        </div>
      ),
    },
  ], [isApprover, user]);

  const primaryActions: ActionButton[] = [
    { label: '新建采购申请', icon: <Plus className="size-4" />, primary: true, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  const batchActions: ActionButton[] = [
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-4" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => purchaseReqsApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  return (
    <>
      <ServerListPage<PurchaseRequisition>
        title={t('采购申请')}
        description="管理采购申请与审批流程，金额≥5000元走两级审批（部门经理→总经理）"
        data={table.data as PurchaseRequisition[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTERS}
        primaryActions={primaryActions}
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
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />

      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />

      <PurchaseFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleCreateSuccess}
        initialData={editRecord ? {
          reason: editRecord.reason,
          expectedDate: editRecord.expected_date || '',
          remark: editRecord.remark || '',
          items: safeItems(editRecord.items).map((it) => ({ ...it, spec: it.spec || '' })),
        } : null}
        editRecordId={editRecord?.id ?? null}
        draftBusinessId={editRecord ? `edit-${editRecord.id}` : 'new'}
      />

      <PurchaseDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        record={currentRecord}
        steps={currentRecord ? toTimelineSteps(currentRecord, detailFlow) : []}
        canApprove={isApprover}
        onGoApprove={(r) => { setDetailOpen(false); setApproveRecord(r); setApproveFlow(detailFlow); }}
        onGenerateOrder={handleGenerateOrder}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该采购申请？</AlertDialogTitle>
            <AlertDialogDescription>删除后采购申请记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApprovalDetailDialog
        open={!!approveRecord}
        onOpenChange={(o) => !o && setApproveRecord(null)}
        title={approveRecord ? approveRecord.reason : ''}
        subtitle={approveRecord?.req_no || ''}
        status={approveRecord?.status || ''}
        statusVariant={approveStatusVariant}
        summaryFields={approvalSummary}
        detailLabel="采购明细"
        detailContent={
          approveRecord ? (
            <div className="space-y-3">
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">物品名称</th>
                      <th className="px-3 py-2 text-left font-medium">规格</th>
                      <th className="px-3 py-2 text-right font-medium">数量</th>
                      <th className="px-3 py-2 text-right font-medium">单价</th>
                      <th className="px-3 py-2 text-right font-medium">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeItems(approveRecord.items).map((it: PurchaseItemView, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{it.name}</td>
                        <td className="px-3 py-2">{it.spec || '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatAmount(it.unit_price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{formatAmount(it.subtotal || it.quantity * it.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/20">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-medium">合计</td>
                      <td className="px-3 py-2 text-right font-bold text-primary tabular-nums">{formatAmount(approveRecord.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {approveRecord.remark && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">备注：</span>{approveRecord.remark}
                </div>
              )}
            </div>
          ) : null
        }
        approvalSteps={approvalSteps}
        canApprove={approveRecord ? canApprove(approveRecord) : false}
        approving={approving}
        onApprove={handleApproveAction}
        currentStepName={currentStepName}
      />
    </>
  );
}
