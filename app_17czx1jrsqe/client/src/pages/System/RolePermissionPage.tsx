import { useState, useMemo, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Shield,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FIELD_PERMISSION_FIELDS, useFieldPermission, type FieldPermission } from '@/hooks/useFieldPermission';
import { rolesApi } from '@/api';

interface RoleRow {
  id: number;
  role_key: string;
  name: string;
  description: string;
  data_scope: string;
  menu_ids: string;
  field_permissions: string;
  is_system: number;
  member_count?: number;
}

interface MenuNode {
  id: string;
  name: string;
  children?: MenuNode[];
}

const MENU_TREE: MenuNode[] = [
  { id: 'm1', name: '工作台' },
  {
    id: 'm2', name: '客户管理',
    children: [
      { id: 'm2-1', name: '公海管理', children: [
        { id: 'm2-1-1', name: '公海客资' },
        { id: 'm2-1-2', name: '无效客资' },
        { id: 'm2-1-3', name: '转化分析' },
      ]},
      { id: 'm2-2', name: '线索管理' },
      { id: 'm2-3', name: '客户管理' },
    ],
  },
  {
    id: 'm3', name: '广告业务',
    children: [
      { id: 'm3-1', name: '开户管理' },
      { id: 'm3-2', name: '报备管理' },
      { id: 'm3-3', name: '转户管理' },
      { id: 'm3-4', name: '提成管理' },
    ],
  },
  {
    id: 'm4', name: '财务管理',
    children: [
      { id: 'm4-1', name: '客户明细' },
      { id: 'm4-2', name: '收款管理' },
      { id: 'm4-3', name: '充值管理' },
      { id: 'm4-4', name: '退款管理' },
      { id: 'm4-5', name: '消耗管理' },
      { id: 'm4-6', name: '垫款管理' },
      { id: 'm4-7', name: '发票管理' },
      { id: 'm4-8', name: '端口管理' },
    ],
  },
  {
    id: 'm5', name: '系统管理',
    children: [
      { id: 'm5-1', name: '组织架构' },
      { id: 'm5-2', name: '角色权限' },
      { id: 'm5-3', name: '操作日志' },
    ],
  },
];

const ALL_TOP_IDS = ['m1', 'm2', 'm3', 'm4', 'm5'];

function MenuTreeNode({ node, level, expanded, onToggle, checked, onCheck }: {
  node: MenuNode;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  checked: Set<string>;
  onCheck: (id: string, c: boolean) => void;
}) {
  const hasChildren = !!node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isChecked = checked.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Checkbox
          checked={isChecked}
          onCheckedChange={(c) => onCheck(node.id, !!c)}
        />
        <span>{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <MenuTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              checked={checked}
              onCheck={onCheck}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RolePermissionPage() {
  const { updateRolePermission, allRolesConfig } = useFieldPermission();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [roleOpen, setRoleOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(ALL_TOP_IDS));
  const [menuChecked, setMenuChecked] = useState<Set<string>>(new Set());
  const [dataScope, setDataScope] = useState('deptAndSub');

  const loadRoles = async () => {
    const res = await rolesApi.list();
    if (res.code === 0 && res.data) {
      const list = (res.data.list || []) as RoleRow[];
      setRoles(list);
      return list;
    }
    return [];
  };

  useEffect(() => {
    setLoading(true);
    loadRoles()
      .then((list) => {
        // 默认选中第一个角色
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => toast.error('角色列表加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedId) || null,
    [roles, selectedId],
  );

  // 切换角色时回填菜单勾选与数据权限
  useEffect(() => {
    if (!selectedRole) return;
    try {
      const ids = JSON.parse(selectedRole.menu_ids || '[]') as string[];
      setMenuChecked(new Set(ids));
    } catch {
      setMenuChecked(new Set());
    }
    setDataScope(selectedRole.data_scope || 'deptAndSub');
  }, [selectedId, selectedRole?.menu_ids, selectedRole?.data_scope]);

  const fieldPermissionsByCategory = useMemo(() => {
    const perms = allRolesConfig[selectedRole?.role_key || ''] || {};
    const groups: Record<string, typeof FIELD_PERMISSION_FIELDS> = {};
    FIELD_PERMISSION_FIELDS.forEach((f) => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return { groups, perms };
  }, [allRolesConfig, selectedRole?.role_key]);

  const handleFieldPermissionChange = (fieldKey: string, perm: FieldPermission) => {
    if (!selectedRole) return;
    updateRolePermission(selectedRole.role_key, fieldKey, perm);
    toast.success('字段权限已更新，点击「保存权限」同步到服务端');
  };

  const fieldPermBadge = (perm: FieldPermission) => {
    if (perm === 'visible') return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">可见</Badge>;
    if (perm === 'masked') return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">脱敏</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">不可见</Badge>;
  };

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMenuCheck = (id: string, checked: boolean) => {
    setMenuChecked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAddRole = async (values: Record<string, unknown>) => {
    const name = String(values.role_name || '').trim();
    const res = await rolesApi.create({ name, description: String(values.role_desc || '自定义角色') });
    if (res.code !== 0) {
      toast.error(res.message || '创建失败');
      return false;
    }
    toast.success(`角色「${name}」已创建，请配置菜单与数据权限`);
    const list = await loadRoles();
    const created = list.find((r) => r.name === name);
    if (created) setSelectedId(created.id);
    return true;
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setRemoving(true);
    try {
      const res = await rolesApi.remove(deleteTarget.id);
      if (res.code === 0) {
        toast.success(`角色「${deleteTarget.name}」已删除`);
        const list = await loadRoles();
        if (selectedId === deleteTarget.id && list.length > 0) setSelectedId(list[0].id);
      } else {
        toast.error(res.message || '删除失败');
      }
    } finally {
      setRemoving(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const perms = allRolesConfig[selectedRole.role_key]
        || Object.fromEntries(FIELD_PERMISSION_FIELDS.map((f) => [f.key, 'visible' as FieldPermission]));
      const res = await rolesApi.update(selectedRole.id, {
        menu_ids: Array.from(menuChecked),
        data_scope: dataScope,
        field_permissions: perms,
      });
      if (res.code === 0) toast.success(`角色「${selectedRole.name}」权限配置已保存，写权限/菜单/数据范围即时生效`);
      else toast.error(res.message || '保存失败');
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!selectedRole) return;
    try {
      const ids = JSON.parse(selectedRole.menu_ids || '[]') as string[];
      setMenuChecked(new Set(ids));
      setDataScope(selectedRole.data_scope || 'deptAndSub');
      toast.info('已恢复为服务端保存的权限配置');
    } catch {
      toast.error('恢复失败');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('角色权限')} description={t('管理系统角色和权限配置，保存后对该角色所有成员生效')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 左侧角色列表 */}
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">角色列表</CardTitle>
            <Button size="sm" variant="outline" className="h-7" onClick={() => setRoleOpen(true)}>
              <Plus className="mr-1 size-3.5" /> 新增
            </Button>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              {!loading && roles.map((r) => (
                <div
                  key={r.id}
                  className={`group cursor-pointer rounded-lg p-3 transition-colors ${
                    selectedId === r.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'border border-transparent hover:bg-muted/60'
                  }`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="flex items-center gap-2">
                    <Shield className={`size-4 ${selectedId === r.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="flex-1 text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.member_count || 0}人</span>
                    {!r.is_system && (
                      <button
                        className="hidden text-muted-foreground hover:text-destructive group-hover:block"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                        title={t('删除角色')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 右侧权限配置 */}
        <Card className="shadow-sm lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">权限配置 · {selectedRole?.name || '—'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold">菜单权限</h3>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border/60 p-2">
                {MENU_TREE.map((node) => (
                  <MenuTreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    expanded={expanded}
                    onToggle={toggleNode}
                    checked={menuChecked}
                    onCheck={handleMenuCheck}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">数据权限</h3>
              <RadioGroup value={dataScope} onValueChange={setDataScope} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all">全部数据</Label>
                  <span className="text-xs text-muted-foreground">可查看所有部门数据</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deptAndSub" id="scope-dept-sub" />
                  <Label htmlFor="scope-dept-sub">本部门及下级部门</Label>
                  <span className="text-xs text-muted-foreground">可查看本部门和下级部门数据</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dept" id="scope-dept" />
                  <Label htmlFor="scope-dept">本部门</Label>
                  <span className="text-xs text-muted-foreground">仅可查看本部门数据</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="scope-self" />
                  <Label htmlFor="scope-self">仅本人</Label>
                  <span className="text-xs text-muted-foreground">仅可查看自己负责的数据</span>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>字段级权限</span>
                <span className="text-xs font-normal text-muted-foreground">
                  控制敏感字段的显示方式，保存后对该角色生效
                </span>
              </h3>
              <div className="rounded-lg border border-border/60">
                {Object.entries(fieldPermissionsByCategory.groups).map(([cat, fields]) => (
                  <div key={cat} className="border-b border-border/60 last:border-b-0">
                    <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <Shield className="size-3.5" /> {cat}
                    </div>
                    <div className="divide-y divide-border/40">
                      {fields.map((f) => {
                        const perm = fieldPermissionsByCategory.perms[f.key] || 'visible';
                        return (
                          <div key={f.key} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                            <div className="flex items-center gap-2 text-sm">
                              {f.label}
                              {fieldPermBadge(perm)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant={perm === 'visible' ? 'default' : 'outline'}
                                className="h-7 px-2.5 text-xs"
                                onClick={() => handleFieldPermissionChange(f.key, 'visible')}
                              >
                                可见
                              </Button>
                              <Button
                                size="sm"
                                variant={perm === 'masked' ? 'default' : 'outline'}
                                className="h-7 px-2.5 text-xs"
                                onClick={() => handleFieldPermissionChange(f.key, 'masked')}
                              >
                                脱敏
                              </Button>
                              <Button
                                size="sm"
                                variant={perm === 'hidden' ? 'destructive' : 'outline'}
                                className="h-7 px-2.5 text-xs"
                                onClick={() => handleFieldPermissionChange(f.key, 'hidden')}
                              >
                                隐藏
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!selectedRole}>
                恢复
              </Button>
              <Button onClick={handleSave} disabled={!selectedRole || saving}>
                {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                保存权限
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <FieldFormDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        title={t('新增角色')}
        description={t('创建新角色后自动选中，可继续配置菜单与数据权限')}
        fields={[
          { key: 'role_name', label: '角色名称', required: true, placeholder: '请输入角色名称' },
          { key: 'role_desc', label: '角色描述', type: 'textarea', placeholder: '如 负责某类业务操作（可选）' },
        ] as FormFieldDef[]}
        submitLabel="创建角色"
        onSubmit={handleAddRole}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色「{deleteTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              角色下如有成员将无法删除；删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} disabled={removing} className="bg-destructive text-destructive-foreground">
              {removing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
