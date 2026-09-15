import { useMemo, useState } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useModuleData } from '@/lib/data-service';
import { recordAuditLog } from '@/lib/audit-log';
import type { IBizRecord } from '@/data/mt-records';

interface IRole {
  id: string;
  name: string;
  code: string;
  permissions: string[];
}

const PERMISSION_CATEGORIES: Record<string, string[]> = {
  '客户管理': ['公海客资-查看', '公海客资-新建', '公海客资-分配', '线索-查看', '线索-新建', '客户-查看', '客户-新建', '客户-编辑', '客户-删除', '转化分析-查看'],
  '广告业务': ['开户申请-查看', '开户申请-新建', '开户申请-审批', '广告账户-查看', '消耗管理-查看', '报备管理-查看', '转户管理-查看', '提成-查看'],
  '视频业务': ['视频订单-查看', '视频订单-新建', '视频项目-查看', '视频项目-编辑', '演员管理-查看', '外包管理-查看', '拍摄费用-查看', '场地费用-查看'],
  '合同财务': ['合同-查看', '合同-新建', '合同-审批', '收款-查看', '充值-查看', '退款-查看', '发票-查看', '财务仪表盘-查看'],
  '人资行政': ['员工-查看', '员工-新建', '员工-编辑', '人资看板-查看', '采购-查看', '采购-审批', '资产-查看', '库存-查看'],
  '系统管理': ['角色权限-查看', '角色权限-编辑', '操作日志-查看', '系统设置-查看', '系统设置-编辑', '审批中心-查看', '审批中心-操作'],
  '报表中心': ['自定义报表-查看', '报表模板-查看', '定时推送-查看', '数据下钻-查看'],
} as const;

/** 将多维表格记录映射到 IRole */
function recordToRole(r: IBizRecord): IRole {
  const menus = String(r.values.f0 ?? '').split(/[,，、;\n/]+/).map((s) => s.trim()).filter(Boolean);
  return {
    id: r.recordId,
    name: String(r.values.f9 ?? '未命名角色'),
    code: String(r.values.f2 ?? ''),
    permissions: menus,
  };
}

export default function RoleManagementPage() {
  const { records, loading, update } = useModuleData('role');
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const roles: IRole[] = useMemo(() => records.map(recordToRole), [records]);

  const filtered = useMemo(() => {
    if (!search) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [roles, search]);

  const openDetail = (role: IRole) => {
    setSelectedRole(role);
    setDialogOpen(true);
  };

  const togglePermission = async (perm: string) => {
    if (!selectedRole) return;
    const updatedPerms = selectedRole.permissions.includes(perm)
      ? selectedRole.permissions.filter((p) => p !== perm)
      : [...selectedRole.permissions, perm];

    const updated = { ...selectedRole, permissions: updatedPerms };
    setSelectedRole(updated);

    try {
      await update(selectedRole.id, { f0: updatedPerms.join(', ') });
      recordAuditLog({ action: '权限变更', module: 'system', description: `修改角色权限: ${updated.name}`, targetId: updated.id }).catch(() => {});
      toast.success('权限已更新并持久化到多维表格');
    } catch (e) {
      toast.error(`权限更新失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">角色权限管理</h2>
        <p className="mt-1 text-sm text-muted-foreground">管理系统角色及其对应的菜单与操作权限（数据来自多维表格「角色权限表」）</p>
      </div>

      {/* 角色列表 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((role) => (
          <Card key={role.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(role)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{role.code}</p>
                  </div>
                </div>
                <Badge variant="secondary">{role.permissions.length} 权限</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 6).map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">{p.split('-')[0]}</Badge>
                ))}
                {role.permissions.length > 6 && (
                  <Badge variant="outline" className="text-xs">+{role.permissions.length - 6}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 权限详情弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              {selectedRole?.name}
              <Badge variant="secondary" className="ml-2">{selectedRole?.permissions.length} 权限</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{category}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {perms.map((perm) => {
                    const has = selectedRole?.permissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                          has ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
                        }`}
                      >
                        {has ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0 opacity-40" />}
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}