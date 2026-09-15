import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit2, Pencil, Trash2, Plus, Phone, Mail, Building2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  customersApi,
  customerContactsApi,
  customerFollowUpsApi,
  accountApplicationsApi,
  contractsApi,
  videoOrdersApi,
  rechargesApi,
  consumptionsApi,
  paymentsApi,
  transactionsApi,
} from '@/api';
import type { Customer } from '@/api/types';
import { formatDateTime, formatAmount } from '@/lib/format';
import { t, useLang } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const LEVEL_LABEL: Record<string, string> = { A: 'A级', B: 'B级', C: 'C级', D: 'D级' };
const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  active: { label: '活跃', variant: 'success' },
  frozen: { label: '冻结', variant: 'warning' },
  lost: { label: '流失', variant: 'danger' },
};

const FOLLOW_ICONS: Record<string, string> = {
  电话: '📞', 微信: '💬', 拜访: '🚗', 会议: '💻', 邮件: '📧',
};

// 按客户汇总财务数据
function calcFinanceStats(recharges: any[], consumes: any[], payments: any[]) {
  const totalRecharge = recharges.reduce((s: number, r: any) => s + (Number(r.received_amount || r.amount) || 0), 0);
  const totalConsume = consumes.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  const totalReceived = payments.reduce((s: number, p: any) => s + (p.status === 'confirmed' || p.status === 'verified' ? Number(p.amount || 0) : 0), 0);
  const balance = Math.max(0, totalRecharge - totalConsume);
  const receivable = Math.max(0, totalConsume - totalReceived);
  const arrears = totalConsume > totalRecharge ? totalConsume - totalRecharge : 0;
  return {
    total_recharge: totalRecharge,
    total_consume: totalConsume,
    balance,
    receivable,
    arrears,
  };
}

export default function CustomerDetailPage() {
  useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('basic');

  // 联系人状态
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({
    name: '', position: '', phone: '', email: '', is_primary: false, remark: '',
  });
  const [contactLoading, setContactLoading] = useState(false);

  // 跟进记录
  const [follows, setFollows] = useState<any[]>([]);
  const [followOpen, setFollowOpen] = useState(false);
  const [followForm, setFollowForm] = useState({
    follow_type: '电话', content: '', next_time: '',
  });
  const [followLoading, setFollowLoading] = useState(false);

  // 业务关联 & 财务数据
  const [bizAccounts, setBizAccounts] = useState<any[]>([]);
  const [bizContracts, setBizContracts] = useState<any[]>([]);
  const [bizVideoOrders, setBizVideoOrders] = useState<any[]>([]);
  const [bizRecharges, setBizRecharges] = useState<any[]>([]);
  const [financeFlow, setFinanceFlow] = useState<any[]>([]);
  const [bizLoading, setBizLoading] = useState(false);

  // 财务统计（实时从充值/消耗/收款汇总）
  const financeStats = useMemo(() => {
    const w = (window as any).__custFinance || {};
    return calcFinanceStats(w.recharges || [], w.consumes || [], w.payments || []);
  }, [bizRecharges, bizLoading]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setBizLoading(true);
    Promise.all([
      customersApi.get(id),
      customerContactsApi.list({ page: 1, pageSize: 200 }),
      customerFollowUpsApi.list({ page: 1, pageSize: 200 }),
      accountApplicationsApi.list({ page: 1, pageSize: 50 }),
      contractsApi.list({ page: 1, pageSize: 50 }),
      videoOrdersApi.list({ page: 1, pageSize: 50 }),
      rechargesApi.list({ page: 1, pageSize: 100 }),
      consumptionsApi.list({ page: 1, pageSize: 200 }),
      paymentsApi.list({ page: 1, pageSize: 50 }),
      transactionsApi.list({ page: 1, pageSize: 100 }),
    ]).then(([
      custRes, contactsRes, followsRes,
      appsRes, contractsRes, videoRes,
      rechargesRes, consumesRes, paymentsRes, txRes,
    ]) => {
      if (custRes.code === 0) setCustomer(custRes.data as Customer);
      else toast.error(custRes.message || '客户加载失败');

      // 按客户名筛选联系人和跟进记录
      const custName = (custRes.data as Customer)?.customer_name || '';
      const filterByCustName = (list: any[], field: string) =>
        list.filter((item) => String(item[field] || '').includes(custName));

      if (contactsRes.code === 0) {
        const all = (contactsRes.data as any)?.list || [];
        setContacts(filterByCustName(all, 'customer_name'));
      }
      if (followsRes.code === 0) {
        const all = (followsRes.data as any)?.list || [];
        setFollows(filterByCustName(all, 'customer_name'));
      }

      // 业务关联：按客户名筛选
      const filterByCustomer = (list: any[], nameField: string | string[]) =>
        list.filter((item: any) => {
          const fields = Array.isArray(nameField) ? nameField : [nameField];
          return fields.some((f) => String(item[f] || '').includes(custName));
        });

      const appsList = (appsRes.data as any)?.list || appsRes.data || [];
      const contractsList = (contractsRes.data as any)?.list || contractsRes.data || [];
      const videoList = (videoRes.data as any)?.list || videoRes.data || [];
      const rechargeList = (rechargesRes.data as any)?.list || rechargesRes.data || [];
      const consumeList = (consumesRes.data as any)?.list || consumesRes.data || [];
      const paymentList = (paymentsRes.data as any)?.list || paymentsRes.data || [];
      const txList = (txRes.data as any)?.list || txRes.data || [];

      setBizAccounts(filterByCustomer(appsList, ['group_name', 'customer_name', 'entity_name']).slice(0, 5));
      setBizContracts(filterByCustomer(contractsList, ['contract_name', 'customer_name', 'entity_name']).slice(0, 5));
      setBizVideoOrders(filterByCustomer(videoList, ['customer_name', 'group_name']).slice(0, 5));
      setBizRecharges(filterByCustomer(rechargeList, ['customer_name', 'group_name']).slice(0, 10));
      setFinanceFlow(filterByCustomer(txList, ['customer_name', 'entity_name']).slice(0, 20));

      // 把按客户筛选的充值/消耗/收款存起来供财务统计用
      const custRecharges = filterByCustomer(rechargeList, ['customer_name', 'group_name']);
      const custConsumes = filterByCustomer(consumeList, ['customer_name']);
      const custPayments = filterByCustomer(paymentList, ['customer_name']);
      // 存入 state 用于财务统计（用上面set过的变量也可以，这里额外用闭包计算）
      (window as any).__custFinance = { recharges: custRecharges, consumes: custConsumes, payments: custPayments };
    }).finally(() => {
      setLoading(false);
      setBizLoading(false);
    });
  }, [id]);

  const statusInfo = useMemo(() => {
    if (!customer) return { label: '-', variant: 'default' };
    return STATUS_MAP[customer.status] || { label: customer.status, variant: 'default' };
  }, [customer]);

  const openContact = (c?: any) => {
    if (c) {
      setEditingContact(c);
      setContactForm({
        name: c.name, position: c.position, phone: c.phone, email: c.email,
        is_primary: c.is_primary, remark: c.remark || '',
      });
    } else {
      setEditingContact(null);
      setContactForm({ name: '', position: '', phone: '', email: '', is_primary: false, remark: '' });
    }
    setContactOpen(true);
  };

  const refreshContacts = () => {
    if (!id || !customer?.customer_name) return;
    setContactLoading(true);
    customerContactsApi.list({ page: 1, pageSize: 200 }).then((res) => {
      if (res.code === 0) {
        const all = (res.data as any)?.list || [];
        setContacts(all.filter((item: any) =>
          String(item.customer_name || '').includes(customer.customer_name)
        ));
      }
    }).finally(() => setContactLoading(false));
  };

  const saveContact = async () => {
    if (!contactForm.name.trim()) {
      toast.warning('请填写联系人姓名');
      return;
    }
    if (!id) return;
    try {
      if (editingContact) {
        const res = await customerContactsApi.update(editingContact.id, contactForm);
        if (res.code === 0) {
          toast.success('联系人已更新');
          refreshContacts();
          setContactOpen(false);
        } else {
          toast.error(res.message || '保存失败');
        }
      } else {
        const res = await customerContactsApi.create({
          ...contactForm,
          customer_id: Number(id),
        });
        if (res.code === 0) {
          toast.success('联系人已添加');
          refreshContacts();
          setContactOpen(false);
        } else {
          toast.error(res.message || '保存失败');
        }
      }
    } catch {
      toast.error('保存失败');
    }
  };

  const deleteContact = async (cid: number) => {
    try {
      const res = await customerContactsApi.remove(cid);
      if (res.code === 0) {
        toast.success('联系人已删除');
        refreshContacts();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const refreshFollows = () => {
    if (!id || !customer?.customer_name) return;
    setFollowLoading(true);
    customerFollowUpsApi.list({ page: 1, pageSize: 200 }).then((res) => {
      if (res.code === 0) {
        const all = (res.data as any)?.list || [];
        setFollows(all.filter((item: any) =>
          String(item.customer_name || '').includes(customer.customer_name)
        ));
      }
    }).finally(() => setFollowLoading(false));
  };

  const addFollow = async () => {
    if (!followForm.content.trim()) {
      toast.warning('请填写跟进内容');
      return;
    }
    if (!id) return;
    try {
      const res = await customerFollowUpsApi.create({
        ...followForm,
        customer_id: Number(id),
        creator_name: '当前用户',
      });
      if (res.code === 0) {
        toast.success('跟进记录已添加');
        refreshFollows();
        setFollowOpen(false);
        setFollowForm({ follow_type: '电话', content: '', next_time: '' });
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>客户不存在</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 size-3.5" /> 返回
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部信息栏 */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:hidden"
          >
            <ArrowLeft className="size-4" /> 返回
          </button>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">
            {customer.customer_name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{customer.customer_name}</h1>
              <Badge variant="outline">{LEVEL_LABEL[customer.level] || customer.level}</Badge>
              <StatusBadge status={statusInfo.label} variant={statusInfo.variant as any} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="size-3.5" /> {customer.group_name}</span>
              <span>{customer.primary_industry} / {customer.secondary_industry}</span>
              <span>负责：{customer.department}</span>
              {customer.contact_phone && (
                <span className="flex items-center gap-1"><Phone className="size-3.5" /> {customer.contact_phone}</span>
              )}
              {customer.contact_email && (
                <span className="flex items-center gap-1"><Mail className="size-3.5" /> {customer.contact_email}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 size-3.5" /> 返回
            </Button>
            <Button variant="outline" size="sm">
              <Edit2 className="mr-1 size-3.5" /> 编辑
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList>
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="contacts">联系人</TabsTrigger>
              <TabsTrigger value="business">业务关联</TabsTrigger>
              <TabsTrigger value="follow">跟进记录</TabsTrigger>
              <TabsTrigger value="finance">财务信息</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {tab === 'basic' && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: '客户编号', value: `KH${String(customer.id).padStart(6, '0')}` },
                { label: '客户名称', value: customer.customer_name },
                { label: '集团名称', value: customer.group_name },
                { label: '一级行业', value: customer.primary_industry },
                { label: '二级行业', value: customer.secondary_industry },
                { label: '客户等级', value: LEVEL_LABEL[customer.level] || customer.level },
                { label: '客户状态', value: statusInfo.label },
                { label: '负责商务', value: '张伟' },
                { label: '所属部门', value: customer.department },
                { label: '联系人', value: customer.contact_name || '-' },
                { label: '联系电话', value: customer.contact_phone || '-' },
                { label: '邮箱', value: customer.contact_email || '-' },
                { label: '地址', value: customer.address || '-' },
                { label: '创建时间', value: formatDateTime(customer.created_at) },
                { label: '备注', value: customer.remark || '-' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-sm">{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'contacts' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => openContact()}>
                  <Plus className="mr-1 size-3.5" /> 新增联系人
                </Button>
              </div>
              <div className="w-full overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">姓名</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">职务</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">手机</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">邮箱</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">主要联系人</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">备注</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          暂无联系人
                        </td>
                      </tr>
                    ) : (
                      contacts.map((c) => (
                        <tr key={c.id} className="border-t border-border/60">
                          <td className="px-4 py-2.5 font-medium">{c.name}</td>
                          <td className="px-4 py-2.5">{c.position || '-'}</td>
                          <td className="px-4 py-2.5">{c.phone || '-'}</td>
                          <td className="px-4 py-2.5">{c.email || '-'}</td>
                          <td className="px-4 py-2.5">
                            {c.is_primary ? (
                              <Badge className="bg-primary/10 text-primary">主要联系人</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{c.remark || '-'}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button className="mr-3 text-xs text-primary hover:underline" onClick={() => openContact(c)}>编辑</button>
                            <button className="text-xs text-destructive hover:underline" onClick={() => deleteContact(c.id)}>删除</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'business' && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold">广告账户</h3>
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">开户ID</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">端口</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">状态</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">申请金额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">申请时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bizAccounts.map((a) => (
                        <tr key={a.id} className="border-t border-border/60">
                          <td className="px-4 py-2 font-mono text-xs">{a.id}</td>
                          <td className="px-4 py-2">{a.port}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={a.status} variant={a.status === '已开户' ? 'success' : 'warning'} />
                          </td>
                          <td className="px-4 py-2 tabular-nums">{formatAmount(a.amount)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{a.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">合同记录</h3>
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">合同ID</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">合同名称</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">金额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">状态</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">签订日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bizContracts.map((c) => (
                        <tr key={c.id} className="border-t border-border/60">
                          <td className="px-4 py-2 font-mono text-xs">{c.id}</td>
                          <td className="px-4 py-2">{c.name}</td>
                          <td className="px-4 py-2 tabular-nums">{formatAmount(c.amount)}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={c.status} variant="success" />
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{c.sign_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">视频订单</h3>
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">订单ID</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">视频类型</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">金额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bizVideoOrders.map((v) => (
                        <tr key={v.id} className="border-t border-border/60">
                          <td className="px-4 py-2 font-mono text-xs">{v.id}</td>
                          <td className="px-4 py-2">{v.type}</td>
                          <td className="px-4 py-2 tabular-nums">{formatAmount(v.amount)}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={v.status} variant="warning" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">充值记录</h3>
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">充值ID</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">端口</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">金额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bizRecharges.map((r) => (
                        <tr key={r.id} className="border-t border-border/60">
                          <td className="px-4 py-2 font-mono text-xs">{r.id}</td>
                          <td className="px-4 py-2">{r.port}</td>
                          <td className="px-4 py-2 tabular-nums">{formatAmount(r.amount)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'follow' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setFollowOpen(true)}>
                  <Plus className="mr-1 size-3.5" /> 添加跟进
                </Button>
              </div>
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 h-full w-px bg-border" />
                {follows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">暂无跟进记录</div>
                ) : (
                  follows.map((f) => (
                    <div key={f.id} className="relative pb-5 last:pb-0">
                      <div className="absolute -left-[19px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] shadow-sm">
                        {FOLLOW_ICONS[f.follow_type] || '📝'}
                      </div>
                      <div className="space-y-1 rounded-md border border-border/60 bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-primary">
                            {f.follow_type} · {f.creator_name}
                          </span>
                          <span className="text-xs text-muted-foreground">{f.created_at}</span>
                        </div>
                        <div className="text-sm text-foreground">{f.content}</div>
                        {f.next_time && (
                          <div className="text-xs text-muted-foreground">
                            下次跟进：{f.next_time}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'finance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  { label: '累计充值', value: financeStats.total_recharge, color: 'text-emerald-600' },
                  { label: '累计消耗', value: financeStats.total_consume, color: 'text-primary' },
                  { label: '账户余额', value: financeStats.balance, color: 'text-amber-600' },
                  { label: '应收金额', value: financeStats.receivable, color: 'text-blue-600' },
                  { label: '欠款金额', value: financeStats.arrears, color: 'text-red-500' },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border border-border/60 bg-muted/10 p-3">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className={`mt-1 text-lg font-semibold tabular-nums ${s.color}`}>
                      {formatAmount(s.value)}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">资金流水</h3>
                <div className="w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">流水ID</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">交易类型</th>
                        <th className="whitespace-nowrap px-4 py-2 text-right font-medium">收入金额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-right font-medium">支出金额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-right font-medium">余额</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">时间</th>
                        <th className="whitespace-nowrap px-4 py-2 text-left font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeFlow.map((f) => (
                        <tr key={f.id} className="border-t border-border/60">
                          <td className="px-4 py-2 font-mono text-xs">#{f.id}</td>
                          <td className="px-4 py-2">
                            <StatusBadge
                              status={f.type}
                              variant={f.type === '充值' ? 'success' : f.type === '消耗' ? 'warning' : 'info'}
                            />
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-emerald-600">
                            {f.income > 0 ? formatAmount(f.income) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-red-500">
                            {f.expense > 0 ? formatAmount(f.expense) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums">
                            {formatAmount(f.balance)}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{f.time}</td>
                          <td className="px-4 py-2 text-muted-foreground">{f.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 联系人弹窗 */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? '编辑联系人' : '新增联系人'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>
                <span className="text-destructive">*</span> 姓名
              </Label>
              <Input
                placeholder="请输入联系人姓名"
                value={contactForm.name}
                onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>职务</Label>
              <Input
                placeholder="如：市场总监"
                value={contactForm.position}
                onChange={(e) => setContactForm((p) => ({ ...p, position: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>手机</Label>
              <Input
                placeholder="请输入手机号"
                value={contactForm.phone}
                onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>邮箱</Label>
              <Input
                placeholder="请输入邮箱"
                value={contactForm.email}
                onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={contactForm.is_primary}
                onCheckedChange={(v) => setContactForm((p) => ({ ...p, is_primary: v }))}
              />
              <Label className="!mb-0">设为主要联系人</Label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Textarea
                rows={3}
                placeholder="补充说明"
                value={contactForm.remark}
                onChange={(e) => setContactForm((p) => ({ ...p, remark: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>取消</Button>
            <Button onClick={saveContact}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加跟进弹窗 */}
      <Dialog open={followOpen} onOpenChange={setFollowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>跟进方式</Label>
              <div className="flex gap-2">
                {['电话', '微信', '拜访', '会议', '邮件'].map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={followForm.follow_type === t ? 'default' : 'outline'}
                    className="h-8"
                    onClick={() => setFollowForm((p) => ({ ...p, follow_type: t }))}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                <span className="text-destructive">*</span> 跟进内容
              </Label>
              <Textarea
                rows={4}
                placeholder="请输入跟进内容"
                value={followForm.content}
                onChange={(e) => setFollowForm((p) => ({ ...p, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>下次跟进时间</Label>
              <Input
                type="datetime-local"
                value={followForm.next_time}
                onChange={(e) => setFollowForm((p) => ({ ...p, next_time: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowOpen(false)}>取消</Button>
            <Button onClick={addFollow}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
