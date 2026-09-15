import { useState, useMemo } from 'react';
import { Building2, ChevronRight, List, Network, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useModuleData } from '@/lib/data-service';
import { recordAuditLog } from '@/lib/audit-log';
import { groupCount, num, val } from '@/lib/analytics';
import { formatUserName } from '@/lib/user-names';
import { formatPhone } from '@/lib/format';
import GenericListPage from '@/components/generic/GenericListPage';
import type { IBizRecord } from '@/data/mt-records';

interface OrgNode {
  record: IBizRecord;
  name: string;
  children: OrgNode[];
}

function buildOrgTree(records: IBizRecord[]): OrgNode[] {
  const nodeMap = new Map<string, OrgNode>();
  for (const r of records) {
    const name = val(r, 'org', '部门名称');
    if (!name) continue;
    nodeMap.set(name, { record: r, name, children: [] });
  }
  const roots: OrgNode[] = [];
  for (const r of records) {
    const name = val(r, 'org', '部门名称');
    if (!name) continue;
    const parent = val(r, 'org', '上级部门');
    const node = nodeMap.get(name);
    if (!node) continue;
    if (parent && nodeMap.has(parent)) {
      nodeMap.get(parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function matchEmployees(empRecords: IBizRecord[], deptName: string): IBizRecord[] {
  return empRecords.filter((emp) => {
    const dept = val(emp, 'hr', '部门');
    if (!dept) return false;
    return dept.includes(deptName) || deptName.includes(dept);
  });
}

function findNode(tree: OrgNode[], name: string): OrgNode | null {
  for (const n of tree) {
    if (n.name === name) return n;
    const found = findNode(n.children, name);
    if (found) return found;
  }
  return null;
}

function OrgTreeNode({
  node,
  depth,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onAddSibling,
}: {
  node: OrgNode;
  depth: number;
  selected: string | null;
  onSelect: (n: OrgNode) => void;
  onEdit: (n: OrgNode) => void;
  onDelete: (n: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  onAddSibling: (sibling: OrgNode) => void;
}) {
  const isSelected = selected === node.name;
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);
  const status = val(node.record, 'org', '状态');
  const headcount = num(node.record, 'org', '编制人数');
  const statusDot = status === '启用' ? 'bg-green-500' : 'bg-gray-400';

  return (
    <div className="group">
      <div
        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
          isSelected ? 'bg-primary/10 font-medium text-primary' : ''
        }`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => {
          onSelect(node);
          if (hasChildren) setExpanded(!expanded);
        }}
      >
        {hasChildren ? (
          <ChevronRight className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1 text-xs">{node.name}</span>
        <span className={`size-2 shrink-0 rounded-full ${statusDot}`} />
        {headcount > 0 && (
          <Badge variant="secondary" className="text-[10px]">{headcount}</Badge>
        )}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="size-5" onClick={(e) => { e.stopPropagation(); onAddChild(node); }} title="新增子部门">
            <Plus className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-5" onClick={(e) => { e.stopPropagation(); onAddSibling(node); }} title="新增同级">
            <Network className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-5" onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-5 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(node); }}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((c) => (
            <OrgTreeNode
              key={c.name}
              node={c}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgFormDialog({
  open,
  onOpenChange,
  node,
  parentNode,
  isSibling,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  node: OrgNode | null;
  parentNode: OrgNode | null;
  isSibling: boolean;
  onSave: (values: Record<string, string | number>) => Promise<void>;
}) {
  const isEdit = node !== null && parentNode === null;
  const parentName = isEdit
    ? val(node!.record, 'org', '上级部门')
    : isSibling && parentNode
      ? val(parentNode.record, 'org', '上级部门')
      : parentNode
        ? parentNode.name
        : '';
  const parentLevel = isEdit
    ? Number(val(node!.record, 'org', '部门层级')) - 1
    : isSibling && parentNode
      ? num(parentNode.record, 'org', '部门层级')
      : parentNode
        ? num(parentNode.record, 'org', '部门层级')
        : 0;
  const level = isEdit
    ? Number(val(node!.record, 'org', '部门层级'))
    : parentLevel + 1;

  const [name, setName] = useState(isEdit ? val(node!.record, 'org', '部门名称') : '');
  const [code, setCode] = useState(isEdit ? val(node!.record, 'org', '部门编号') : '');
  const [headcount, setHeadcount] = useState(isEdit ? String(num(node!.record, 'org', '编制人数')) : '');
  const [status, setStatus] = useState(isEdit ? val(node!.record, 'org', '状态') : '启用');
  const [duty, setDuty] = useState(isEdit ? val(node!.record, 'org', '部门职责') : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入部门名称');
      return;
    }
    setSaving(true);
    try {
      const values: Record<string, string | number> = {
        name: name.trim(),
        f1: parentName,
        f2: level,
        f5: code.trim(),
        f11: Number(headcount) || 0,
        status,
        f9: duty.trim(),
      };
      await onSave(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑部门' : isSibling ? '新增同级部门' : '新增子部门'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改部门基本信息' : `上级部门：${parentName || '无（根部门）'}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">部门名称 *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：商务一部" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">部门编号</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="如：D111" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">编制人数</label>
              <Input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">状态</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="启用">启用</SelectItem>
                <SelectItem value="停用">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">部门职责</label>
            <Input value={duty} onChange={(e) => setDuty(e.target.value)} placeholder="简要描述部门职责" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>{isEdit ? '保存修改' : '创建部门'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrgDetailPanel({
  orgRecords,
  empRecords,
  selectedNode,
}: {
  orgRecords: IBizRecord[];
  empRecords: IBizRecord[];
  selectedNode: OrgNode | null;
}) {
  if (!selectedNode) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="size-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">选择左侧部门查看详情</p>
        </CardContent>
      </Card>
    );
  }

  const r = selectedNode.record;
  const deptName = val(r, 'org', '部门名称');
  const employees = matchEmployees(empRecords, deptName);
  const positions = groupCount(employees, 'hr', '岗位');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4" />
            {deptName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">部门编号</span>
              <p className="font-medium">{val(r, 'org', '部门编号') || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">部门层级</span>
              <p className="font-medium">{val(r, 'org', '部门层级') || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">上级部门</span>
              <p className="font-medium">{val(r, 'org', '上级部门') || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">部门负责人</span>
              <p className="font-medium">{formatUserName(val(r, 'org', '部门负责人'))}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">编制人数</span>
              <p className="font-medium">{num(r, 'org', '编制人数') || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">状态</span>
              <p>
                <Badge variant={val(r, 'org', '状态') === '启用' ? 'default' : 'secondary'} className="text-xs">
                  {val(r, 'org', '状态') || '—'}
                </Badge>
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">部门职责</span>
              <p className="font-medium">{val(r, 'org', '部门职责') || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="size-4" />
            部门员工 ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无员工数据</EmptyTitle>
                <EmptyDescription>请先在「员工」表中维护人员信息并关联本部门</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">姓名</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">岗位</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">在职状态</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">联系方式</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const empName = formatUserName(val(emp, 'hr', '姓名'));
                    const position = val(emp, 'hr', '岗位');
                    const empStatus = val(emp, 'hr', '员工状态');
                    const phone = formatPhone(val(emp, 'hr', '手机号'));
                    const isActive = empStatus === '在职' || empStatus === '正式' || empStatus === '试用期';
                    return (
                      <tr key={emp.recordId} className="border-b border-border/40 transition-colors hover:bg-muted/50">
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium">{empName || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{position || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">{empStatus || '—'}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{phone || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {positions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">岗位汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {positions.map((p) => (
                <Badge key={p.name} variant="outline" className="text-xs">
                  {p.name}：{p.value}人
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function OrgTreeDashboardPage() {
  const { records, loading, create, update, remove } = useModuleData('org');
  const { records: empRecords, loading: empLoading } = useModuleData('hr');
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formNode, setFormNode] = useState<OrgNode | null>(null);
  const [formParentNode, setFormParentNode] = useState<OrgNode | null>(null);
  const [formIsSibling, setFormIsSibling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null);
  const [viewMode, setViewMode] = useState('tree');

  const tree = useMemo(() => buildOrgTree(records), [records]);

  const selectedNode = useMemo(() => {
    if (!selected) return null;
    return findNode(tree, selected);
  }, [tree, selected]);

  const openCreate = () => {
    setFormNode(null);
    setFormParentNode(null);
    setFormIsSibling(false);
    setFormOpen(true);
  };

  const openAddChild = (parent: OrgNode) => {
    setFormNode(null);
    setFormParentNode(parent);
    setFormIsSibling(false);
    setFormOpen(true);
  };

  const openAddSibling = (sibling: OrgNode) => {
    setFormNode(null);
    setFormParentNode(sibling);
    setFormIsSibling(true);
    setFormOpen(true);
  };

  const openEdit = (node: OrgNode) => {
    setFormNode(node);
    setFormParentNode(null);
    setFormIsSibling(false);
    setFormOpen(true);
  };

  const handleSave = async (values: Record<string, string | number>) => {
    if (formNode) {
      await update(formNode.record.recordId, values);
      toast.success('部门已更新');
      recordAuditLog({ action: '更新部门', module: 'org', description: formNode.record.recordId });
    } else {
      await create(values);
      toast.success('部门已创建');
      recordAuditLog({ action: '新建部门', module: 'org', description: '' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.record.recordId);
    toast.success('部门已删除');
    recordAuditLog({ action: '删除部门', module: 'org', description: deleteTarget.record.recordId });
    if (selected === deleteTarget.name) setSelected(null);
    setDeleteTarget(null);
  };

  const isLoading = loading || empLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">组织架构</h2>
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList>
            <TabsTrigger value="tree">
              <Network className="mr-1.5 size-3.5" />
              树形视图
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-1.5 size-3.5" />
              列表视图
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'tree' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">部门结构</CardTitle>
              <Button variant="ghost" size="icon" className="size-7" onClick={openCreate}>
                <Plus className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-0.5">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : tree.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>暂无部门</EmptyTitle>
                    <EmptyDescription>请先在「组织架构表」中维护部门信息</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                tree.map((node) => (
                  <OrgTreeNode
                    key={node.name}
                    node={node}
                    depth={0}
                    selected={selected}
                    onSelect={(n) => setSelected(n.name)}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onAddChild={openAddChild}
                    onAddSibling={openAddSibling}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <OrgDetailPanel orgRecords={records} empRecords={empRecords} selectedNode={selectedNode} />
        </div>
      ) : (
        <GenericListPage moduleKey="org" />
      )}

      <OrgFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        node={formNode}
        parentNode={formParentNode}
        isSibling={formIsSibling}
        onSave={handleSave}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除部门</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除部门「{deleteTarget?.name}」？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}