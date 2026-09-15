import { useState, useMemo } from 'react';
import { Settings, Pencil, Save, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { MODULES } from '@/config/modules';
import { useModuleData } from '@/lib/data-service';
import { val } from '@/lib/analytics';
import { toast } from 'sonner';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit';

/** 5 类系统设置模板 */
const SETTING_CATEGORIES = [
  {
    key: 'poolRule', label: '公海规则',
    items: [
      { key: 'poolReclaimDays', label: '公海回收天数', value: '30', unit: '天', desc: '客户超过此天数未跟进将自动回收至公海' },
      { key: 'poolPerPersonLimit', label: '每人领取上限', value: '50', unit: '个', desc: '每人每天可从公海领取的客户上限' },
      { key: 'poolDailyLimit', label: '每日领取上限', value: '10', unit: '个', desc: '每人每天领取上限' },
      { key: 'poolAutoAssign', label: '自动分配开关', value: '开启', unit: '', desc: '是否开启自动分配', type: 'select', options: ['开启', '关闭'] },
      { key: 'poolAssignMethod', label: '分配方式', value: '轮询', unit: '', desc: '自动分配策略', type: 'select', options: ['轮询', '随机', '负载均衡'] },
    ],
  },
  {
    key: 'approvalFlow', label: '审批流程',
    items: [
      { key: 'approvalCustomerLevel', label: '客户审批节点', value: '商务总监', unit: '', desc: '客户相关审批节点', type: 'select', options: ['商务总监', '销售经理', '老板'] },
      { key: 'approvalAdLevel', label: '广告审批节点', value: '媒介总监', unit: '', desc: '广告相关审批节点', type: 'select', options: ['媒介总监', '商务总监', '老板'] },
      { key: 'approvalContractLevel', label: '合同审批节点', value: '老板', unit: '', desc: '合同相关审批节点', type: 'select', options: ['商务总监', '财务总监', '老板'] },
      { key: 'approvalFinanceLevel', label: '财务审批节点', value: '财务总监', unit: '', desc: '财务相关审批节点', type: 'select', options: ['财务总监', '老板'] },
    ],
  },
  {
    key: 'numberRule', label: '编号规则',
    items: [
      { key: 'prefixCustomer', label: '客户编号前缀', value: 'KH', unit: '', desc: '客户编号前缀' },
      { key: 'prefixContract', label: '合同编号前缀', value: 'HT', unit: '', desc: '合同编号前缀' },
      { key: 'prefixOrder', label: '订单编号前缀', value: 'DD', unit: '', desc: '订单编号前缀' },
      { key: 'prefixPurchase', label: '采购编号前缀', value: 'CG', unit: '', desc: '采购编号前缀' },
      { key: 'autoIncrementStart', label: '自增起始值', value: '10001', unit: '', desc: '编号自增起始' },
    ],
  },
  {
    key: 'commissionRule', label: '提成规则',
    items: [
      { key: 'adCommissionTier1', label: '广告提成T1(≤10万)', value: '8%', unit: '', desc: '广告消耗≤10万提成比例' },
      { key: 'adCommissionTier2', label: '广告提成T2(10-50万)', value: '12%', unit: '', desc: '广告消耗10-50万提成比例' },
      { key: 'adCommissionTier3', label: '广告提成T3(>50万)', value: '15%', unit: '', desc: '广告消耗>50万提成比例' },
      { key: 'videoCommissionTier1', label: '视频提成T1(≤5万)', value: '10%', unit: '', desc: '视频项目≤5万提成比例' },
      { key: 'videoCommissionTier2', label: '视频提成T2(>5万)', value: '18%', unit: '', desc: '视频项目>5万提成比例' },
    ],
  },
  {
    key: 'systemParam', label: '系统参数',
    items: [
      { key: 'taxRate', label: '税点', value: '6%', unit: '', desc: '增值税税率' },
      { key: 'customerWarningDays', label: '客户预警天数', value: '7', unit: '天', desc: '客户超过天数未跟进预警' },
      { key: 'contractWarningDays', label: '合同到期预警', value: '30', unit: '天', desc: '合同到期前预警天数' },
      { key: 'lowStockThreshold', label: '低库存阈值', value: '10', unit: '个', desc: '库存低于此数量标红预警' },
      { key: 'adBudgetWarning', label: '广告预算预警', value: '80%', unit: '', desc: '广告消耗达到预算比例时预警' },
    ],
  },
];

/**
 * 尝试从 system 模块的 records 中匹配已有设置值
 * 匹配规则：设置项名称匹配预设 key
 */
function matchSettingValue(records: any[], key: string): string {
  for (const r of records) {
    const name = val(r, 'system', '设置项') || '';
    const value = val(r, 'system', '设置值') || '';
    if (name === key) return value;
    // 模糊匹配：设置项包含 key 关键词
    if (name.includes(key) || key.includes(name)) return value;
  }
  return '';
}

/** 系统管理 · 系统设置 */
export default function SystemSettingsPage() {
  const { records, loading } = useModuleData('system');
  const route = MODULES.system.route;
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    return SETTING_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => {
        const existingVal = matchSettingValue(records, item.key);
        return { ...item, value: existingVal || item.value };
      }),
    }));
  }, [records]);

  const startEdit = (catKey: string, items: { key: string; value: string }[]) => {
    const vals: Record<string, string> = {};
    for (const item of items) {
      vals[item.key] = item.value;
    }
    setEditValues(vals);
    setEditing(catKey);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValues({});
  };

  const saveEdit = async (catKey: string) => {
    setSaving(true);
    const cat = groups.find((g) => g.key === catKey);
    if (!cat) { setSaving(false); return; }
    try {
      const tableId = 'tbljF0XqkOYbdKOn'; // 系统设置表
      const batchRecords = cat.items.map((item) => ({
        recordId: '', // 通过设置项名称匹配
        fields: {
          '设置项': item.key,
          '设置值': editValues[item.key] ?? item.value,
          '设置分类': cat.label,
          '说明': item.desc,
        },
      }));
      await capabilityClient.load('mt-bitable').call('batchUpdateRecords', {
        tableId,
        records: batchRecords,
      });
      toast.success(`${cat.label} 设置已保存`);
      setEditing(null);
      setEditValues({});
    } catch (e) {
      logger.error('保存设置失败:', String(e));
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">系统设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">公海规则、审批流程、编号规则、提成规则、系统参数等全局配置，点击「编辑」可修改后保存</p>
      </div>

      {groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <Settings className="size-8 text-muted-foreground/50" />
            <EmptyTitle>暂无设置项</EmptyTitle>
            <EmptyDescription>请先在「系统设置」表中维护参数</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((cat) => {
            const isEditing = editing === cat.key;
            return (
              <Card key={cat.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="size-4 text-primary" />
                    {cat.label}
                    <Badge variant="secondary" className="ml-auto text-[11px]">{cat.items.length} 项</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {cat.items.map((item) => (
                    <div key={item.key} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{item.label}</div>
                        {isEditing ? (
                          <div className="mt-1">
                            {item.type === 'select' && item.options ? (
                              <Select value={editValues[item.key] ?? item.value} onValueChange={(v) => updateField(item.key, v)}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={editValues[item.key] ?? item.value}
                                onChange={(e) => updateField(item.key, e.target.value)}
                                className="h-8 text-sm"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="mt-0.5 text-sm font-semibold text-primary">
                            {item.value}{item.unit ? <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span> : null}
                          </div>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      {!isEditing ? null : null}
                    </div>
                  ))}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-3">
                    {!isEditing ? (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => startEdit(cat.key, cat.items)}>
                        <Pencil className="size-3 mr-1" /> 编辑
                      </Button>
                    ) : (
                      <>
                        <Button variant="default" size="sm" className="text-xs" disabled={saving} onClick={() => saveEdit(cat.key)}>
                          <Save className="size-3 mr-1" /> {saving ? '保存中...' : '保存'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={cancelEdit}>
                          <Undo2 className="size-3 mr-1" /> 取消
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}