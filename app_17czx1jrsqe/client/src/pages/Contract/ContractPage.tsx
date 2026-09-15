import { useMemo, useState, useEffect, useCallback } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
import type { ApprovalStep } from '@/components/ApprovalTimeline';
import { Plus, Bell, Percent, FileDown, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDate } from '@/lib/format';
import { exportCSV } from '@/lib/export';
import { contractsApi, contractTemplatesApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useApp } from '@/context/AppContext';
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

export interface Contract {
  id: number;
  contract_no: string;
  name: string;
  subject_name: string;
  type: string;
  amount: number;
  sign_date: string;
  end_date: string;
  status: string;
  owner: string;
  remark?: string;
  last_remind_at?: string | null;
  has_commission?: number;
  created_at?: string;
}

const STATUS_OPTS = [
  { label: '全部', value: '' },
  { label: '待审批', value: '待审批' },
  { label: '审批中', value: '审批中' },
  { label: '已生效', value: '已生效' },
  { label: '已到期', value: '已到期' },
  { label: '已终止', value: '已终止' },
];

const TYPE_OPTS = [
  { label: '全部', value: '' },
  { label: '广告投放', value: '广告投放' },
  { label: '视频制作', value: '视频制作' },
  { label: '服务合同', value: '服务合同' },
];

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
  待审批: 'warning',
  审批中: 'default',
  已生效: 'success',
  已到期: 'secondary',
  已终止: 'danger',
};

const DETAIL_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  待审批: 'warning',
  审批中: 'default',
  已生效: 'success',
  已到期: 'secondary',
  已终止: 'destructive',
};

// 生成合同审批步骤（会签流程：经理 → 法务+财务会签 → 总经理）
export function genContractApprovalSteps(contract: Contract): ApprovalStep[] {
  const steps: ApprovalStep[] = [
    {
      id: 0,
      step_name: '提交合同申请',
      approver_name: contract.owner || '申请人',
      status: 'approved',
      is_submit: true,
      approved_at: (contract.sign_date || contract.created_at?.slice(0, 10) || '') + ' 09:30:00',
    },
    {
      id: 1,
      step_name: '商务经理审批',
      approver_name: '张经理',
      status: contract.status === '待审批' ? 'current' : 'approved',
      mode: 'single',
      approved_at: contract.status !== '待审批' ? (contract.sign_date || '') + ' 11:20:00' : undefined,
      comment: contract.status !== '待审批' ? '合同内容完整，同意提交会签' : undefined,
    },
  ];

  // 会签节点：法务+财务
  const countersignStatus: 'pending' | 'approved' | 'rejected' | 'current' =
    contract.status === '已生效' ? 'approved'
    : contract.status === '已终止' ? 'rejected'
    : contract.status === '审批中' ? 'current'
    : 'pending';

  // 预置「会签进行中」的合同：法务已通过，财务待审批
  const isMidCountersign = contract.status === '审批中' && contract.amount > 500000;

  steps.push({
    id: 2,
    step_name: '法务 & 财务会签',
    approver_name: '法务/财务',
    status: isMidCountersign ? 'current' : countersignStatus,
    mode: 'countersign',
    sub_approvers: [
      {
        name: '陈法务',
        status: isMidCountersign ? 'approved' : (countersignStatus === 'rejected' ? 'rejected' : countersignStatus),
        comment: isMidCountersign ? '法务条款合规，无风险' : countersignStatus === 'rejected' ? '法务条款存在风险' : '法务条款合规',
        approved_at: isMidCountersign || countersignStatus === 'approved' || countersignStatus === 'rejected' ? (contract.sign_date || '') + ' 14:05:00' : undefined,
      },
      {
        name: '李财务',
        status: isMidCountersign ? 'current' : (countersignStatus === 'rejected' ? 'rejected' : countersignStatus),
        comment: countersignStatus === 'rejected' ? '回款条件不合理' : (countersignStatus === 'approved' ? '财务无异议' : undefined),
        approved_at: countersignStatus === 'approved' || countersignStatus === 'rejected' ? (contract.sign_date || '') + ' 15:30:00' : undefined,
      },
    ],
  });

  steps.push({
    id: 3,
    step_name: '总经理审批',
    approver_name: '王总',
    status: contract.status === '已生效' ? 'approved' : (contract.status === '已终止' ? 'rejected' : 'pending'),
    mode: 'single',
    approved_at: contract.status === '已生效' ? (contract.sign_date || '') + ' 17:00:00' : undefined,
    comment: contract.status === '已生效' ? '同意签署' : undefined,
  });

  return steps;
}

export default function ContractPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 提醒
  const [remindItem, setRemindItem] = useState<Contract | null>(null);
  const [remindLoading, setRemindLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // 加载合同模板
  useEffect(() => {
    contractTemplatesApi.list({ status: 'active', page: 1, page_size: 50 }).then((res: any) => {
      if (res.code === 0) setTemplates(res.data?.list || res.data || []);
    }).catch(() => {});
  }, []);

  const templateOptions = useMemo(
    () => [{ label: '不使用模板', value: '' }, ...templates.map((t: any) => ({ label: t.template_name || t.name, value: String(t.id) }))],
    [templates],
  );

  // 模板选择联动：选择模板后自动填充合同类型、名称前缀、金额等
  const handleTemplateChange = (values: Record<string, unknown>, changedKey: string) => {
    if (changedKey !== 'template_id' || !values.template_id) return;
    const tpl = templates.find((t: any) => String(t.id) === String(values.template_id));
    if (!tpl) return;
    // 用 setTimeout 避免在 render 中直接改 form（onValuesChange 在渲染中调用）
    setTimeout(() => {
      const form = document.querySelector('[role="dialog"] form');
      if (!form) return;
      // 通过 dispatchEvent 方式不可靠，改用直接设置全局标志位
      // 实际通过 FieldFormDialog 的 form ref 或外部控制更优；此处用 sessionStorage 传递预填值 + 触发重渲染
      sessionStorage.setItem('__mutang_contract_tpl_prefill__', JSON.stringify({
        template_id: String(tpl.id),
        name: tpl.template_name ? `${tpl.template_name}-` : '',
        type: tpl.contract_type || '',
        amount: tpl.default_amount || 0,
        remark: tpl.terms ? `【模板条款】${tpl.terms.slice(0, 100)}${tpl.terms?.length > 100 ? '...' : ''}` : '',
      }));
      // 触发一次重渲让 FieldFormDialog 读预填
      setTemplates([...templates]);
    }, 0);
  };

  // 审批详情
  const [detailItem, setDetailItem] = useState<Contract | null>(null);
  const [approving, setApproving] = useState(false);

  // 新建合同
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL ?tpl=1 参数触发：从模板跳转来，自动打开新建弹窗并回填模板数据
  useEffect(() => {
    if (searchParams.get('tpl') === '1') {
      setCreateOpen(true);
      // 清除参数，避免刷新重复触发
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 从模板跳转过来的预填值（通过 sessionStorage 传递）
  const [tplPrefill, setTplPrefill] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    if (createOpen) {
      const raw = sessionStorage.getItem('__mutang_template_prefill__')
        || sessionStorage.getItem('__mutang_contract_tpl_prefill__');
      if (raw) {
        try {
          setTplPrefill(JSON.parse(raw));
        } catch { /* ignore */ }
        sessionStorage.removeItem('__mutang_template_prefill__');
        sessionStorage.removeItem('__mutang_contract_tpl_prefill__');
      }
    } else {
      setTplPrefill(null);
    }
  }, [createOpen]);

  // 合并初始值：模板预填 + 默认值
  const createInitialValues = useMemo(() => {
    if (!tplPrefill) return undefined;
    return {
      name: tplPrefill.name || '',
      type: tplPrefill.type || '广告投放',
      amount: tplPrefill.amount || 0,
      remark: tplPrefill.remark || '',
      template_id: tplPrefill.template_id ? String(tplPrefill.template_id) : '',
      sign_date: new Date().toISOString().slice(0, 10),
    };
  }, [tplPrefill]);

  // 申请提成
  const [commissionItem, setCommissionItem] = useState<Contract | null>(null);
  const [commissionRate, setCommissionRate] = useState('5');
  const [commissionRemark, setCommissionRemark] = useState('');
  const [commissionLoading, setCommissionLoading] = useState(false);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const table = useServerList({
    fetchFn: contractsApi.list,
    defaultPageSize: 20,
  });

  const detailSteps = useMemo(() => {
    if (!detailItem) return [];
    return genContractApprovalSteps(detailItem);
  }, [detailItem]);

  // 当前用户是否可审批当前合同（根据角色判断）
  const canApproveCurrent = useMemo(() => {
    if (!detailItem) return false;
    if (detailItem.status !== '待审批' && detailItem.status !== '审批中') return false;
    const role = user?.role || 'admin';
    if (role === 'admin') return true; // 总经理
    if (detailItem.status === '待审批' && role === 'manager') return true;
    if (detailItem.status === '审批中') {
      if (role === 'hr' || role === 'finance') return true; // 会签：法务(hr模拟)/财务
    }
    return false;
  }, [detailItem, user]);

  const currentStepName = useMemo(() => {
    if (!detailItem) return '';
    const cur = detailSteps.find(s => s.status === 'current');
    return cur?.step_name || '';
  }, [detailSteps, detailItem]);

  const handleApproval = useCallback(async (action: 'approve' | 'reject') => {
    if (!detailItem) return;
    const id = validateRecordId(detailItem);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
    setApproving(true);
    try {
      const res = await contractsApi.approve(id, action);
      if (res.code === 0) {
        const newStatus = res.data?.status || detailItem.status;
        setDetailItem(prev => (prev ? { ...prev, status: newStatus } : prev));
        table.refresh();
        toast.success(action === 'approve' ? (newStatus === '已生效' ? '审批通过，合同已生效' : '审批通过，已流转到下一步') : '已驳回');
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setApproving(false);
    }
  }, [detailItem]);

  const CONTRACT_FORM_FIELDS: FormFieldDef[] = [
    { key: 'template_id', label: '合同模板', type: 'select', options: templateOptions, placeholder: '选择模板自动带出字段' },
    { key: 'name', label: '合同名称', type: 'input', required: true, placeholder: '请输入合同名称' },
    { key: 'subject_name', label: '主体名称', type: 'input', required: true, placeholder: '请输入主体名称' },
    { key: 'type', label: '合同类型', type: 'select', required: true, options: [
      { label: '广告投放', value: '广告投放' },
      { label: '视频制作', value: '视频制作' },
      { label: '服务合同', value: '服务合同' },
    ]},
    { key: 'amount', label: '合同金额（元）', type: 'number', required: true, placeholder: '请输入合同金额' },
    { key: 'owner', label: '负责人', type: 'input', required: true, placeholder: '请输入负责人姓名' },
    { key: 'sign_date', label: '签订日期', type: 'input', placeholder: 'YYYY-MM-DD', defaultValue: new Date().toISOString().slice(0, 10) },
    { key: 'end_date', label: '到期日期', type: 'input', placeholder: 'YYYY-MM-DD' },
    { key: 'remark', label: '备注', type: 'textarea', fullWidth: true, placeholder: '请输入备注信息' },
  ];

  const handleCreateContract = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await contractsApi.create({
        contract_no: `HT${Date.now().toString().slice(-8)}`,
        name: String(values.name || ''),
        subject_name: String(values.subject_name || ''),
        type: String(values.type || '广告投放'),
        amount: Number(values.amount || 0),
        sign_date: String(values.sign_date || new Date().toISOString().slice(0, 10)),
        end_date: String(values.end_date || ''),
        status: '待审批',
        owner: String(values.owner || ''),
        remark: String(values.remark || ''),
      });
      if (res.code === 0) {
        toast.success('合同创建成功，已进入审批流程');
        table.refresh();
        return true;
      }
      toast.error(res.message || '创建失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const handleRemind = async () => {
    if (!remindItem) return;
    const id = validateRecordId(remindItem);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setRemindItem(null); return; }
    setRemindLoading(true);
    try {
      const res = await contractsApi.remind(id);
      if (res.code === 0) {
        toast.success(`提醒已发送给 ${remindItem.owner}`);
        setRemindItem(null);
        table.refresh();
      } else {
        toast.error(res.message || '提醒发送失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setRemindLoading(false);
    }
  };

  const commissionAmount = useMemo(() => {
    if (!commissionItem) return 0;
    return commissionItem.amount * (Number(commissionRate) / 100);
  }, [commissionItem, commissionRate]);

  const handleCommissionSubmit = async () => {
    if (!commissionItem) return;
    const id = validateRecordId(commissionItem);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setCommissionItem(null); return; }
    setCommissionLoading(true);
    try {
      const res = await contractsApi.applyCommission(id, {
        rate: Number(commissionRate) || 0,
        remark: commissionRemark,
      });
      if (res.code === 0) {
        toast.success('提成申请已提交');
        setCommissionItem(null);
        setCommissionRate('5');
        setCommissionRemark('');
        table.refresh();
      } else {
        toast.error(res.message || '提交失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleExport = (rows?: Contract[]) => {
    const list = rows || (table.data as Contract[]);
    if (list.length === 0) {
      toast.warning('当前无可导出的数据');
      return;
    }
    const dataRows = list.map((r) => [r.contract_no, r.name, r.subject_name, r.type, r.amount, r.sign_date, r.end_date, r.status, r.owner]);
    exportCSV(
      '合同管理',
      ['合同编号', '合同名称', '主体名称', '合同类型', '合同金额', '签订日期', '到期日期', '状态', '负责人'],
      dataRows,
    );
    toast.success(`已导出 ${list.length} 条`);
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await contractsApi.remove(id);
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

  const filterFields: FilterField[] = [
    { key: 'keyword', label: '合同编号/名称/主体/负责人', type: 'input', placeholder: '搜索合同编号、名称、主体或负责人' },
    { key: 'type', label: '合同类型', type: 'select', options: TYPE_OPTS },
    { key: 'status', label: '合同状态', type: 'select', options: STATUS_OPTS },
  ];

  const columns: Column<Contract>[] = [
    { key: 'contract_no', title: '合同编号', width: '120px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.contract_no}</span> },
    { key: 'name', title: '合同名称', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'subject_name', title: '主体名称', render: (r) => <span className="block truncate max-w-[200px]">{r.subject_name}</span> },
    { key: 'type', title: '合同类型', width: '100px', render: (r) => <>{r.type || '-'}</> },
    { key: 'amount', title: '合同金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'sign_date', title: '签订日期', width: '110px', sortable: true, render: (r) => formatDate(r.sign_date) },
    { key: 'end_date', title: '到期日期', width: '110px', render: (r) => formatDate(r.end_date) },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (r) => (
        <StatusBadge status={r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
      ),
    },
    { key: 'owner', title: '负责人', width: '80px', render: (r) => <>{r.owner || '-'}</> },
  ];

  const primaryActions: ActionButton[] = [
    { label: '新建合同', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setCreateOpen(true) },
    { label: '批量导出', icon: <FileDown className="size-3.5" />, onClick: () => {
      if (selectedKeys.length > 0) {
        const selected = (table.data as Contract[]).filter((r) => selectedKeys.includes(String(r.id)));
        handleExport(selected);
      } else {
        handleExport();
      }
    } },
  ];

  const rowActions = (record: Contract): ActionButton[] => {
    const actions: ActionButton[] = [
      {
        label: record.last_remind_at ? `已提醒(${String(record.last_remind_at).slice(5, 16)})` : '一键提醒',
        onClick: () => setRemindItem(record),
      },
    ];
    if (record.status === '已生效') {
      actions.push({
        label: record.has_commission ? '已申请提成' : '申请提成',
        onClick: () => {
          if (record.has_commission) {
            toast.warning('该合同已申请过提成');
            return;
          }
          setCommissionItem(record);
          setCommissionRate('5');
        },
      });
    }
    actions.push({ label: '详情', onClick: () => navigate(`/contract/contracts/${record.id}`) });
    actions.push({ label: '审批流', onClick: () => setDetailItem(record) });
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Contract>
        title={t('合同管理')}
        description={t('管理所有合同，跟踪合同状态和生命周期')}
        data={table.data as Contract[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={filterFields}
        primaryActions={primaryActions}
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
        emptyActionText="新建第一条合同"
        onEmptyAction={() => setCreateOpen(true)}
      />

      {/* 审批详情弹窗 */}
      {detailItem && (
        <ApprovalDetailDialog
          open={!!detailItem}
          onOpenChange={(o) => !o && setDetailItem(null)}
          title={`合同详情 · ${detailItem.name}`}
          subtitle={detailItem.contract_no}
          status={detailItem.status}
          statusVariant={DETAIL_STATUS_VARIANT[detailItem.status] || 'default'}
          summaryFields={[
            { label: '合同名称', value: detailItem.name },
            { label: '主体名称', value: detailItem.subject_name },
            { label: '合同类型', value: detailItem.type },
            { label: '合同金额', value: <span className="font-semibold text-primary tabular-nums">{formatAmount(detailItem.amount)}</span> },
            { label: '签订日期', value: formatDate(detailItem.sign_date) },
            { label: '到期日期', value: formatDate(detailItem.end_date) },
            { label: '负责人', value: detailItem.owner },
            { label: '合同状态', value: <StatusBadge status={detailItem.status} variant={STATUS_VARIANT[detailItem.status] || 'default'} /> },
          ] as ApprovalSummaryField[]}
          detailContent={
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <FileText className="size-4" />
                <span>备注信息</span>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {detailItem.remark || '本合同为标准框架合同，包含广告投放服务相关条款，双方权利义务明确，结算方式为月结，合作周期内按实际消耗结算。'}
              </p>
            </div>
          }
          detailLabel="合同信息"
          approvalSteps={detailSteps}
          canApprove={canApproveCurrent}
          approving={approving}
          onApprove={handleApproval}
          currentStepName={currentStepName}
        />
      )}

      {/* 新建合同 */}
      <FieldFormDialog
        key={tplPrefill ? `tpl-${tplPrefill.template_id || '0'}` : 'new'}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={tplPrefill ? `新建合同（模板：${tplPrefill.template_name || tplPrefill.name || ''}）` : '新建合同'}
        description={t('填写合同基本信息，提交后进入审批流程')}
        fields={CONTRACT_FORM_FIELDS}
        submitLabel="提交审批"
        initialValues={createInitialValues}
        onSubmit={handleCreateContract}
        onValuesChange={handleTemplateChange}
        draft={{
          formType: 'contract',
          businessId: 'new',
          summaryField: 'name',
        }}
        confirmSubmit={{
          amountField: 'amount',
          summaryFields: [
            { key: 'name', label: '合同名称' },
            { key: 'subject_name', label: '主体名称' },
            { key: 'type', label: '合同类型' },
            { key: 'amount', label: '合同金额' },
            { key: 'owner', label: '负责人' },
          ],
          title: '确认提交合同审批？',
        }}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除该合同吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLocked} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-1 size-4" /> {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 一键提醒 */}
      <AlertDialog open={!!remindItem} onOpenChange={(o) => !o && setRemindItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" /> 发送催办提醒
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定向合同「{remindItem?.name}」负责人 <b>{remindItem?.owner}</b> 发送催办提醒吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remindItem?.last_remind_at && (
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-700">
              上次提醒时间：{remindItem.last_remind_at}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemind} disabled={remindLoading}>
              {remindLoading ? '发送中...' : '确认发送'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 申请提成 */}
      <Dialog open={!!commissionItem} onOpenChange={(o) => !o && setCommissionItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="size-4 text-primary" /> 申请提成
            </DialogTitle>
            <DialogDescription>填写提成信息，提交后进入审核流程</DialogDescription>
          </DialogHeader>
          {commissionItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 rounded-md bg-muted/30 p-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">合同名称</div>
                  <div className="mt-0.5 font-medium line-clamp-1">{commissionItem.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">合同金额</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-primary">{formatAmount(commissionItem.amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">负责人</div>
                  <div className="mt-0.5">{commissionItem.owner}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">合同类型</div>
                  <div className="mt-0.5">{commissionItem.type}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>提成比例（%）</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>提成金额（元）</Label>
                  <Input value={formatAmount(commissionAmount)} readOnly className="font-semibold text-primary" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>申请说明</Label>
                <Textarea
                  rows={3}
                  placeholder="请输入申请说明..."
                  value={commissionRemark}
                  onChange={(e) => setCommissionRemark(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommissionItem(null)}>取消</Button>
            <Button onClick={handleCommissionSubmit} disabled={commissionLoading}>
              {commissionLoading ? '提交中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
