import { useState, useMemo } from 'react';
import { Building2, ChevronRight, Network, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useModuleData } from '@/lib/data-service';
import { recordAuditLog } from '@/lib/audit-log';
import { val } from '@/lib/analytics';
import { formatUserName } from '@/lib/user-names';
import { formatPhone } from '@/lib/format';
import type { IBizRecord } from '@/data/mt-records';

interface OrgNode {
  record: IBizRecord | null;
  name: string;
  parentName: string;
  children: OrgNode[];
  employees: IBizRecord[];
}

/** 从员工表按部门聚合构建组织架构树 */
function buildTreeFromEmployees(empRecords: IBizRecord[]): OrgNode[] {
  const deptMap = new Map<string, IBizRecord[]>();
  empRecords.forEach((r) => {
    const dept = String(val(r, 'hr', '部门') ?? val(r, 'hr', '所属部门') ?? r.values.department ?? '');
    if (!dept) return;
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push(r);
  });

  const roots: OrgNode[] = [];
  deptMap.forEach((emps, deptName) => {
    roots.push({
      record: null,
      name: deptName,
      parentName: '',
      children: [],
      employees: emps,
    });
  });
  // 按部门名称排序
  roots.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  return roots;
}

function OrgTreeNode({ node, depth, selected, onSelect, onEdit, onDelete }: {
  node: OrgNode;
  depth: number;
  selected: string | null;
  onSelect: (n: OrgNode) => void;
  onEdit: (n: OrgNode) => void;
  onDelete: (n: OrgNode) => void;
}) {
  const isSelected = selected === node.name;
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div className="group">
      <div
        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
          isSelected ? 'bg-primary/10 text-primary font-medium' : ''
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
        <Badge variant="secondary" className="text-[10px]">{node.employees.length}</Badge>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
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
            <OrgTreeNode key={c.name} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 人资管理 · 组织架构(左侧部门树 + 右侧详情) */
export default function OrgTreePage() {
  const { records, loading, update, remove, create } = useModuleData('org');
  const { records: empRecords, loading: empLoading } = useModuleData('hr');
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [formName, setFormName] = useState('');
  const [formParent, setFormParent] = useState('');
  const [formDuty, setFormDuty] = useState('');
  const [formLeader, setFormLeader] = useState('');
  const [formStatus, setFormStatus] = useState('正常');

  const tree = useMemo(() => buildTreeFromEmployees(empRecords), [empRecords]);

  const selectedNode = useMemo(() => {
    if (!selected) return null;
    const find = (nodes: OrgNode[]): OrgNode | null => {
      for (const n of nodes) {
        if (n.name === selected) return n;
        const found = find(n.children);
        if (found) return found;
      }
      return null;
    };
    return find(tree);
  }, [tree, selected]);

  const openCreate = () => {
    setEditingNode(null);
    setFormName('');
    setFormParent('');
    setFormDuty('');
    setFormLeader('');
    setFormStatus('正常');
    setDialogOpen(true);
  };

  const openEdit = (node: OrgNode) => {
    setEditingNode(node);
    setFormName(node.name);
    setFormParent(node.parentName);
    setFormDuty(val(node.record, 'org', '部门职责') || '');
    setFormLeader(val(node.record, 'org', '部门负责人') || '');
    setFormStatus(val(node.record, 'org', '状态') || '正常');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('请输入部门名称');
      return;
    }
    if (editingNode) {
      await update(editingNode.record!.recordId, {
        name: formName,
        parent: formParent,
        duty: formDuty,
        leader: formLeader,
        status: formStatus,
      });
      toast.success('部门已更新');
      recordAuditLog({ action: '更新部门', module: 'org', description: editingNode.record!.recordId });
    } else {
      await create({
        name: formName,
        parent: formParent,
        duty: formDuty,
        leader: formLeader,
        status: formStatus,
      });
      toast.success('部门已创建');
      recordAuditLog({ action: '新建部门', module: 'org', description: '' });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (node: OrgNode) => {
    if (node.record) {
      await remove(editingNode.record!.recordId);
      toast.success('部门已删除');
      recordAuditLog({ action: '删除部门', module: 'org', description: node.record.recordId });
      if (selected === node.name) setSelected(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* 左侧部门树 */}
      <Card className="lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">组织架构</CardTitle>
          <Button variant="ghost" size="icon" className="size-7" onClick={openCreate}>
            <Plus className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {empLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无部门</EmptyTitle>
                <EmptyDescription>请先在「员工」表中维护部门信息</EmptyDescription>
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
                onDelete={handleDelete}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* 右侧详情 */}
      <div>
        <Card>
          {selectedNode ? (
            <Tabs defaultValue="employees">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedNode.name}</CardTitle>
                  <TabsList>
                    <TabsTrigger value="employees">部门员工 ({selectedNode.employees.length})</TabsTrigger>
                    <TabsTrigger value="positions">岗位信息</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                <TabsContent value="employees" className="mt-0">
                  {selectedNode.employees.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <Users className="size-8 text-muted-foreground/50" />
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
                          {selectedNode.employees.map((emp) => {
                            const name = formatUserName(String(val(emp, 'hr', '姓名') ?? emp.values.name ?? ''));
                            const position = String(val(emp, 'hr', '岗位') ?? emp.values.position ?? '');
                            const status = String(val(emp, 'hr', '员工状态') ?? emp.values.status ?? '');
                            const phone = formatPhone(String(val(emp, 'hr', '手机号') ?? emp.values.phone ?? ''));
                            return (
                              <tr key={emp.recordId} className="border-b border-border/40 transition-colors hover:bg-muted/50">
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium">{name || '—'}</td>
                                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{position || '—'}</td>
                                <td className="whitespace-nowrap px-3 py-2.5">
                                  <Badge variant={status === '在职' ? 'default' : 'secondary'} className="text-xs">{status || '—'}</Badge>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{phone || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="positions" className="mt-0">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">岗位名称</p>
                    <p className="text-sm">{val(selectedNode.record, 'org', '岗位') || '—'}</p>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-xs text-muted-foreground">汇报关系</p>
                    <p className="text-sm">{val(selectedNode.record, 'org', '汇报关系') || '—'}</p>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">选择左侧部门查看详情</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* 新增/编辑部门弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNode ? '编辑部门' : '新增部门'}</DialogTitle>
            <DialogDescription>填写部门基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">部门名称 *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="如：技术部" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">上级部门</label>
              <Select value={formParent} onValueChange={setFormParent}>
                <SelectTrigger>
                  <SelectValue placeholder="无 (根部门)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无 (根部门)</SelectItem>
                  {tree.map((n) => (
                    <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">部门负责人</label>
              <Input value={formLeader} onChange={(e) => setFormLeader(e.target.value)} placeholder="部门负责人姓名" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">部门职责</label>
              <Input value={formDuty} onChange={(e) => setFormDuty(e.target.value)} placeholder="简要描述部门职责" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="正常">正常</SelectItem>
                  <SelectItem value="停用">停用</SelectItem>
                  <SelectItem value="合并">合并</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editingNode ? '保存修改' : '创建部门'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}