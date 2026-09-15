import { useState, useEffect, useMemo } from 'react';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Building2,
  Plus,
  Edit,
  Trash2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { departmentsApi, employeesApi } from '@/api';

interface DeptRow {
  id: number;
  dept_code: string;
  name: string;
  parent_id: number;
  leader: string;
  phone?: string;
  sort?: number;
}

interface EmployeeRow {
  id: number;
  employee_no: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  join_date?: string;
  status: string;
}

interface OrgNode {
  id: number;
  name: string;
  leader: string;
  count: number;
  children: OrgNode[];
}

const EMP_STATUS_MAP: Record<string, string> = {
  active: '在职',
  probation: '试用',
  resigned: '离职',
};

function buildTree(depts: DeptRow[], countMap: Map<string, number>): OrgNode[] {
  const byParent = new Map<number, DeptRow[]>();
  depts.forEach((d) => {
    const list = byParent.get(d.parent_id) || [];
    list.push(d);
    byParent.set(d.parent_id, list);
  });
  const build = (rows: DeptRow[]): OrgNode[] =>
    rows
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map((d) => {
        const children = build(byParent.get(d.id) || []);
        const direct = countMap.get(d.name) || 0;
        return {
          id: d.id,
          name: d.name,
          leader: d.leader,
          count: direct + children.reduce((s, c) => s + c.count, 0),
          children,
        };
      });
  return build(byParent.get(0) || []);
}

/** 收集节点自身及所有子孙部门名称 */
function collectNames(node: OrgNode): string[] {
  return [node.name, ...node.children.flatMap((c) => collectNames(c))];
}

function findNodeById(nodes: OrgNode[], id: number): OrgNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNodeById(n.children, id);
    if (found) return found;
  }
  return null;
}

function TreeNode({ node, level, expanded, onToggle, selected, onSelect }: {
  node: OrgNode;
  level: number;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  selected: number;
  onSelect: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm ${
          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Building2 className="size-4 text-[#1677FF]" />
        <span className="flex-1 truncate">{node.name}</span>
        <span className="text-xs text-muted-foreground">({node.count})</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DEPT_FORM_FIELDS: FormFieldDef[] = [
  { key: 'name', label: '部门名称', required: true, placeholder: '请输入部门名称' },
  { key: 'leader', label: '负责人', placeholder: '请输入负责人姓名（可选）' },
  { key: 'phone', label: '联系电话', placeholder: '请输入联系电话（可选）' },
];

const MEMBER_FORM_FIELDS: FormFieldDef[] = [
  { key: 'name', label: '姓名', required: true, placeholder: '请输入成员姓名' },
  { key: 'position', label: '岗位', required: true, placeholder: '如 商务专员' },
  { key: 'phone', label: '手机号', required: true, placeholder: '请输入手机号' },
  { key: 'email', label: '邮箱', placeholder: 'name@mutang.com（可选）' },
  { key: 'status', label: '状态', type: 'select', required: true, options: [
    { label: '在职', value: 'active' },
    { label: '试用', value: 'probation' },
    { label: '离职', value: 'resigned' },
  ], defaultValue: 'active' },
];

export default function OrganizationPage() {
  const [depts, setDepts] = useState<DeptRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number>(0);

  const [deptOpen, setDeptOpen] = useState(false);
  const [editDept, setEditDept] = useState<DeptRow | null>(null);
  const [deleteDeptTarget, setDeleteDeptTarget] = useState<OrgNode | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [editMember, setEditMember] = useState<EmployeeRow | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<EmployeeRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadAll = async () => {
    const [deptRes, empRes] = await Promise.all([
      departmentsApi.list({ page: 1, pageSize: 200 }),
      employeesApi.list({ page: 1, pageSize: 200 }),
    ]);
    if (deptRes.code === 0 && deptRes.data) {
      const list = deptRes.data.list || [];
      setDepts(list);
      setExpanded(new Set(list.filter((d: DeptRow) => list.some((c: DeptRow) => c.parent_id === d.id)).map((d: DeptRow) => d.id)));
    }
    if (empRes.code === 0 && empRes.data) setEmployees(empRes.data.list || []);
  };

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch(() => toast.error('组织架构加载失败'))
      .finally(() => setLoading(false));
  }, []);

  // 各部门在职人数统计（不含离职）
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      if (e.status !== 'resigned') map.set(e.department, (map.get(e.department) || 0) + 1);
    });
    return map;
  }, [employees]);

  const tree = useMemo(() => buildTree(depts, countMap), [depts, countMap]);

  const selectedNode = useMemo(
    () => (selected ? findNodeById(tree, selected) : null),
    [tree, selected],
  );

  const memberDepts = useMemo(
    () => (selectedNode ? collectNames(selectedNode) : []),
    [selectedNode],
  );

  const members = useMemo(
    () => (selectedNode ? employees.filter((e) => memberDepts.includes(e.department)) : employees),
    [employees, memberDepts, selectedNode],
  );

  const toggleNode = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveDept = async (values: Record<string, unknown>) => {
    const name = String(values.name || '').trim();
    const leader = String(values.leader || '').trim();
    const phone = String(values.phone || '').trim();
    if (editDept) {
      const res = await departmentsApi.update(editDept.id, { name, leader, phone });
      if (res.code !== 0) {
        toast.error(res.message || '保存失败');
        return false;
      }
      toast.success(`部门「${name}」已更新`);
    } else {
      if (!selectedNode) {
        toast.error('请先在左侧选择上级部门');
        return false;
      }
      const res = await departmentsApi.create({
        dept_code: `D${Date.now()}`,
        name,
        parent_id: selectedNode.id,
        leader,
        phone,
      });
      if (res.code !== 0) {
        toast.error(res.message || '创建失败');
        return false;
      }
      setExpanded((prev) => new Set(prev).add(selectedNode.id));
      toast.success(`部门「${name}」已添加到「${selectedNode.name}」下`);
    }
    await loadAll();
    return true;
  };

  const handleDeleteDept = async () => {
    if (!deleteDeptTarget) return;
    setRemoving(true);
    try {
      const res = await departmentsApi.remove(deleteDeptTarget.id);
      if (res.code === 0) {
        toast.success(`部门「${deleteDeptTarget.name}」已删除`);
        if (selected === deleteDeptTarget.id) setSelected(0);
        await loadAll();
      } else {
        toast.error(res.message || '删除失败');
      }
    } finally {
      setRemoving(false);
      setDeleteDeptTarget(null);
    }
  };

  const handleSaveMember = async (values: Record<string, unknown>) => {
    const payload = {
      name: String(values.name || ''),
      position: String(values.position || ''),
      phone: String(values.phone || ''),
      email: String(values.email || ''),
      status: String(values.status || 'active'),
    };
    if (editMember) {
      const res = await employeesApi.update(editMember.id, payload);
      if (res.code !== 0) {
        toast.error(res.message || '保存失败');
        return false;
      }
      toast.success(`成员「${payload.name}」信息已更新`);
    } else {
      if (!selectedNode) {
        toast.error('请先在左侧选择部门');
        return false;
      }
      const res = await employeesApi.create({
        employee_no: `MT${Date.now()}`,
        department: selectedNode.name,
        join_date: new Date().toISOString().slice(0, 10),
        ...payload,
      });
      if (res.code !== 0) {
        toast.error(res.message || '创建失败');
        return false;
      }
      toast.success(`成员「${payload.name}」已添加到「${selectedNode.name}」`);
    }
    await loadAll();
    return true;
  };

  const handleDeleteMember = async () => {
    if (!deleteMemberTarget) return;
    setRemoving(true);
    try {
      const res = await employeesApi.remove(deleteMemberTarget.id);
      if (res.code === 0) {
        toast.success(`成员「${deleteMemberTarget.name}」已移除`);
        await loadAll();
      } else {
        toast.error(res.message || '删除失败');
      }
    } finally {
      setRemoving(false);
      setDeleteMemberTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('组织架构')} description={t('管理公司部门结构与人员归属，部门与成员数据实时同步员工档案')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">部门架构</CardTitle>
            <Button size="sm" variant="outline" className="h-7" onClick={() => { setEditDept(null); setDeptOpen(true); }}>
              <Plus className="mr-1 size-3.5" /> 新增
            </Button>
          </CardHeader>
          <CardContent className="p-2">
            {loading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="mb-2 h-8 w-full" />)}
            {!loading && tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                expanded={expanded}
                onToggle={toggleNode}
                selected={selected}
                onSelect={setSelected}
              />
            ))}
            {!loading && selectedNode && (
              <div className="mt-3 flex gap-1 border-t border-border/60 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 px-2 text-xs"
                  onClick={() => {
                    const row = depts.find((d) => d.id === selectedNode.id);
                    if (row) {
                      setEditDept(row);
                      setDeptOpen(true);
                    }
                  }}
                >
                  <Edit className="mr-1 size-3.5" /> 编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 px-2 text-xs text-destructive"
                  onClick={() => setDeleteDeptTarget(selectedNode)}
                >
                  <Trash2 className="mr-1 size-3.5" /> 删除
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              部门成员 · {selectedNode ? selectedNode.name : '全部'}
              <span className="ml-2 text-xs font-normal text-muted-foreground">共 {members.length} 人</span>
            </CardTitle>
            <Button size="sm" className="h-8" onClick={() => {
              if (!selectedNode) {
                toast.error('请先在左侧选择部门');
                return;
              }
              setEditMember(null);
              setMemberOpen(true);
            }}>
              <Users className="mr-1 size-3.5" /> 添加成员
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="whitespace-nowrap">姓名</TableHead>
                    <TableHead className="whitespace-nowrap">部门</TableHead>
                    <TableHead className="whitespace-nowrap">岗位</TableHead>
                    <TableHead className="whitespace-nowrap">手机号</TableHead>
                    <TableHead className="whitespace-nowrap">邮箱</TableHead>
                    <TableHead className="whitespace-nowrap">状态</TableHead>
                    <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))}
                  {!loading && members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        该部门暂无成员，点击右上角「添加成员」录入
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.department}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.position}</TableCell>
                      <TableCell className="tabular-nums">{m.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email}</TableCell>
                      <TableCell><StatusBadge status={EMP_STATUS_MAP[m.status] || m.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setEditMember(m); setMemberOpen(true); }}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() => setDeleteMemberTarget(m)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <FieldFormDialog
        key={editDept ? `edit-dept-${editDept.id}` : 'create-dept'}
        open={deptOpen}
        onOpenChange={(o) => {
          setDeptOpen(o);
          if (!o) setEditDept(null);
        }}
        title={editDept ? `编辑部门：${editDept.name}` : '新增部门'}
        description={editDept ? '修改部门基础信息' : (selectedNode ? `新部门将添加到「${selectedNode.name}」下` : '请先在左侧选择上级部门')}
        fields={DEPT_FORM_FIELDS}
        submitLabel={editDept ? '保存修改' : '确认新增'}
        onSubmit={handleSaveDept}
        initialValues={editDept ? { name: editDept.name, leader: editDept.leader, phone: editDept.phone || '' } : null}
      />

      <FieldFormDialog
        key={editMember ? `edit-member-${editMember.id}` : 'create-member'}
        open={memberOpen}
        onOpenChange={(o) => {
          setMemberOpen(o);
          if (!o) setEditMember(null);
        }}
        title={editMember ? `编辑成员：${editMember.name}` : `添加成员到「${selectedNode?.name || ''}」`}
        description={t('录入成员信息，带 * 为必填项，成员档案同步到员工管理')}
        fields={MEMBER_FORM_FIELDS}
        submitLabel={editMember ? '保存修改' : '添加成员'}
        onSubmit={handleSaveMember}
        initialValues={editMember ? {
          name: editMember.name,
          position: editMember.position,
          phone: editMember.phone,
          email: editMember.email,
          status: editMember.status,
        } : null}
      />

      <AlertDialog open={!!deleteDeptTarget} onOpenChange={(o) => { if (!o) setDeleteDeptTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除部门「{deleteDeptTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              该部门下如有子部门或在职员工将无法删除，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDept} disabled={removing} className="bg-destructive text-destructive-foreground">
              {removing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMemberTarget} onOpenChange={(o) => { if (!o) setDeleteMemberTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除成员「{deleteMemberTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              成员档案将从员工管理中删除，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} disabled={removing} className="bg-destructive text-destructive-foreground">
              {removing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
