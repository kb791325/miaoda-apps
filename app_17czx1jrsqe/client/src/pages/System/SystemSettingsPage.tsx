import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { t } from '@/lib/i18n';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { settingsApi } from '@/api';
import UnsavedChangesDialog from './UnsavedChangesDialog';

type SettingsMap = Record<string, string>;

/** 五个设置分组的默认值（与后端种子一致，后端无数据时兜底） */
const GROUP_DEFAULTS: Record<string, SettingsMap> = {
  public_sea: {
    recycle_days: '7',
    enabled: 'true',
    claim_limit: '50',
    assign_rule: 'round_robin',
    level_a: '500000',
    level_b: '200000',
    level_c: '50000',
  },
  clue: {
    auto_assign: 'true',
    recycle_days: '15',
    source_scope: 'all',
  },
  customer: {
    id_prefix: 'CU',
    auto_no: 'true',
    merge_rule: 'byName',
  },
  alert: {
    balance_threshold: '10000',
    contract_remind_days: '30',
    feishu_notify: 'false',
    email_notify: 'true',
  },
  tax: {
    vat_rate: '6',
    surcharge_rate: '0.72',
    culture_fee_rate: '0',
  },
};

const TAB_TO_GROUP: Record<string, string> = {
  publicSea: 'public_sea',
  clue: 'clue',
  customer: 'customer',
  warning: 'alert',
  tax: 'tax',
};

const PATH_TO_TAB: Record<string, string> = {
  'public-sea': 'publicSea',
  'clue': 'clue',
  'customer': 'customer',
  'alert': 'warning',
  'tax': 'tax',
};

const SETTINGS_PATH_PREFIX = '/system/settings';

function SettingCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SettingRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function TabDot({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500 align-middle" />;
}

function TabSaveFooter({ group, saving, disabled, onSave }: { group: string; saving: string | null; disabled: boolean; onSave: (g: string) => void }) {
  return (
    <div className="flex justify-end pt-1">
      <Button onClick={() => onSave(group)} disabled={disabled || saving !== null}>
        {saving === group && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        保存本页设置
      </Button>
    </div>
  );
}

export default function SystemSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('publicSea');
  const [allSettings, setAllSettings] = useState<Record<string, SettingsMap>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [leavePath, setLeavePath] = useState<string | null>(null);

  const tabRef = useRef(tab);
  const dirtyRef = useRef(false);

  const dirtyMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    (Object.values(TAB_TO_GROUP) as string[]).forEach((g: string) => {
      const snap = savedSnapshot[g];
      map[g] = snap !== undefined && JSON.stringify(allSettings[g] || {}) !== snap;
    });
    return map;
  }, [allSettings, savedSnapshot]);

  const tabDirty = useCallback(
    (t: string): boolean => dirtyMap[TAB_TO_GROUP[t]] ?? false,
    [dirtyMap],
  );

  const dirty = tabDirty(tab);
  dirtyRef.current = dirty;
  tabRef.current = tab;

  const group = TAB_TO_GROUP[tab] || 'public_sea';
  const current = allSettings[group] || GROUP_DEFAULTS[group] || {};

  // 根据路径自动切换 tab（有未保存修改时拦截，弹确认）
  useEffect(() => {
    const parts = location.pathname.split('/');
    const last = parts[parts.length - 1];
    const mapped = PATH_TO_TAB[last];
    if (!mapped || mapped === tabRef.current) return;
    if (dirtyRef.current) setPendingTab(mapped);
    else setTab(mapped);
  }, [location.pathname]);

  // 一次性加载全部分组配置
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const result: Record<string, SettingsMap> = {};
      await Promise.all(
        Object.values(TAB_TO_GROUP).map(async (g: string) => {
          try {
            const res = await settingsApi.getGroup(g);
            if (res.code === 0 && res.data) {
              result[g] = { ...GROUP_DEFAULTS[g], ...(res.data as SettingsMap) };
            } else {
              result[g] = { ...GROUP_DEFAULTS[g] };
            }
          } catch {
            result[g] = { ...GROUP_DEFAULTS[g] };
          }
        }),
      );
      const snaps: Record<string, string> = {};
      (Object.keys(result) as string[]).forEach((g: string) => {
        snaps[g] = JSON.stringify(result[g]);
      });
      setAllSettings(result);
      setSavedSnapshot(snaps);
      setLoading(false);
    }
    loadAll();
  }, []);

  const updateValue = useCallback((key: string, value: string) => {
    setAllSettings((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: value },
    }));
  }, [group]);

  const handleSaveGroup = async (g: string) => {
    const data = allSettings[g];
    if (!data) return;
    setSavingGroup(g);
    try {
      const res = await settingsApi.saveGroup(g, data);
      if (res.code === 0) {
        toast.success('配置已保存');
        setSavedSnapshot((prev) => ({ ...prev, [g]: JSON.stringify(data) }));
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSavingGroup(null);
    }
  };

  const handleTabChange = (next: string) => {
    if (next === tab) return;
    if (dirtyRef.current) setPendingTab(next);
    else setTab(next);
  };

  const handleConfirmDiscard = () => {
    if (pendingTab) {
      setTab(pendingTab);
      setPendingTab(null);
    } else if (leavePath) {
      setLeavePath(null);
      navigate(leavePath);
    }
  };

  const handleCancelDiscard = () => {
    setPendingTab(null);
    setLeavePath(null);
  };

  // 离开设置页（站内导航）：有未保存修改时拦截侧边栏等链接点击，弹确认
  useEffect(() => {
    if (!dirty) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || /^https?:\/\//.test(href)) return;
      if (href.includes(SETTINGS_PATH_PREFIX)) return;
      e.preventDefault();
      e.stopPropagation();
      setLeavePath(href);
    };
    document.addEventListener('click', handleDocClick, true);
    return () => document.removeEventListener('click', handleDocClick, true);
  }, [dirty]);

  // 浏览器刷新/关闭拦截
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const num = (key: string) => current[key] ?? '';
  const bool = (key: string) => current[key] === 'true';

  return (
    <div className="space-y-4">
      <PageHeader title={t('系统设置')} description={t('配置系统核心参数和业务规则，保存后立即生效')} />
      <Tabs defaultValue="publicSea" value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger value="publicSea" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">公海设置<TabDot show={tabDirty('publicSea')} /></TabsTrigger>
          <TabsTrigger value="clue" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">线索设置<TabDot show={tabDirty('clue')} /></TabsTrigger>
          <TabsTrigger value="customer" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">客户设置<TabDot show={tabDirty('customer')} /></TabsTrigger>
          <TabsTrigger value="warning" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">预警设置<TabDot show={tabDirty('warning')} /></TabsTrigger>
          <TabsTrigger value="tax" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">税点设置<TabDot show={tabDirty('tax')} /></TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-4">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {!loading && (
            <>
              <TabsContent value="publicSea" className="mt-0 space-y-4">
                <SettingCard title={t('公海基础设置')} description={t('配置公海客资的基本规则')}>
                  <SettingRow label="自动回收天数" hint="客资超过N天未跟进自动回收到公海">
                    <Input type="number" value={num('recycle_days')} onChange={(e) => updateValue('recycle_days', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="启用公海池" hint="关闭后客资不会自动回收到公海">
                    <Switch checked={bool('enabled')} onCheckedChange={(v) => updateValue('enabled', String(v))} />
                  </SettingRow>
                  <SettingRow label="领取上限/人" hint="每个商务最多同时持有的公海客资数量">
                    <Input type="number" value={num('claim_limit')} onChange={(e) => updateValue('claim_limit', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="分配规则" hint="自动分配时候选负责人的轮询方式">
                    <Select value={current.assign_rule || 'round_robin'} onValueChange={(v) => updateValue('assign_rule', v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">负责人轮询</SelectItem>
                        <SelectItem value="by_department">按部门轮流</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </SettingCard>
                <SettingCard title={t('客资分层配置')} description={t('配置客户分层等级')}>
                  <SettingRow label="A级客户标准" hint="月消耗 ≥ 多少元判定为A级">
                    <Input type="number" value={num('level_a')} onChange={(e) => updateValue('level_a', e.target.value)} className="w-40" />
                  </SettingRow>
                  <SettingRow label="B级客户标准">
                    <Input type="number" value={num('level_b')} onChange={(e) => updateValue('level_b', e.target.value)} className="w-40" />
                  </SettingRow>
                  <SettingRow label="C级客户标准">
                    <Input type="number" value={num('level_c')} onChange={(e) => updateValue('level_c', e.target.value)} className="w-40" />
                  </SettingRow>
                </SettingCard>
                <TabSaveFooter group="public_sea" saving={savingGroup} disabled={loading} onSave={handleSaveGroup} />
              </TabsContent>

              <TabsContent value="clue" className="mt-0 space-y-4">
                <SettingCard title={t('线索设置')}>
                  <SettingRow label="自动分配线索" hint="新线索自动分配给对应商务">
                    <Switch checked={bool('auto_assign')} onCheckedChange={(v) => updateValue('auto_assign', String(v))} />
                  </SettingRow>
                  <SettingRow label="线索回收周期(天)">
                    <Input type="number" value={num('recycle_days')} onChange={(e) => updateValue('recycle_days', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="线索来源分类" hint="（规划中：暂未接入来源抓单流程）">
                    <Select value={current.source_scope || 'all'} onValueChange={(v) => updateValue('source_scope', v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部启用</SelectItem>
                        <SelectItem value="online">仅线上来源</SelectItem>
                        <SelectItem value="offline">仅线下来源</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </SettingCard>
                <TabSaveFooter group="clue" saving={savingGroup} disabled={loading} onSave={handleSaveGroup} />
              </TabsContent>

              <TabsContent value="customer" className="mt-0 space-y-4">
                <SettingCard title={t('客户设置')}>
                  <SettingRow label="客户ID前缀">
                    <Input value={num('id_prefix')} onChange={(e) => updateValue('id_prefix', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="自动生成客户编号">
                    <Switch checked={bool('auto_no')} onCheckedChange={(v) => updateValue('auto_no', String(v))} />
                  </SettingRow>
                  <SettingRow label="客户合并规则">
                    <Select value={current.merge_rule || 'byName'} onValueChange={(v) => updateValue('merge_rule', v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="byName">按客户名称</SelectItem>
                        <SelectItem value="bySubject">按主体名称</SelectItem>
                        <SelectItem value="manual">手动合并</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </SettingCard>
                <TabSaveFooter group="customer" saving={savingGroup} disabled={loading} onSave={handleSaveGroup} />
              </TabsContent>

              <TabsContent value="warning" className="mt-0 space-y-4">
                <SettingCard title={t('预警设置')}>
                  <SettingRow label="余额预警阈值(元)" hint="客户账户余额低于此值时触发预警">
                    <Input type="number" value={num('balance_threshold')} onChange={(e) => updateValue('balance_threshold', e.target.value)} className="w-40" />
                  </SettingRow>
                  <SettingRow label="合同到期提醒(天)" hint="合同到期前N天开始提醒">
                    <Input type="number" value={num('contract_remind_days')} onChange={(e) => updateValue('contract_remind_days', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="飞书通知" hint="预警消息同步到飞书">
                    <Switch checked={bool('feishu_notify')} onCheckedChange={(v) => updateValue('feishu_notify', String(v))} />
                  </SettingRow>
                  <SettingRow label="邮件通知">
                    <Switch checked={bool('email_notify')} onCheckedChange={(v) => updateValue('email_notify', String(v))} />
                  </SettingRow>
                </SettingCard>
                <TabSaveFooter group="alert" saving={savingGroup} disabled={loading} onSave={handleSaveGroup} />
              </TabsContent>

              <TabsContent value="tax" className="mt-0 space-y-4">
                <SettingCard title={t('税点设置')}>
                  <SettingRow label="增值税率(%)">
                    <Input type="number" value={num('vat_rate')} onChange={(e) => updateValue('vat_rate', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="附加税率(%)">
                    <Input type="number" value={num('surcharge_rate')} onChange={(e) => updateValue('surcharge_rate', e.target.value)} className="w-32" />
                  </SettingRow>
                  <SettingRow label="文化事业建设费(%)">
                    <Input type="number" value={num('culture_fee_rate')} onChange={(e) => updateValue('culture_fee_rate', e.target.value)} className="w-32" />
                  </SettingRow>
                </SettingCard>
                <TabSaveFooter group="tax" saving={savingGroup} disabled={loading} onSave={handleSaveGroup} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>

      <UnsavedChangesDialog
        open={pendingTab !== null || leavePath !== null}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </div>
  );
}
