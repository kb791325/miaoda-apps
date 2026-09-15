import { useState, useMemo } from 'react';
import { ShieldCheck, ShieldQuestion, Check, Save, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { useModuleData } from '@/lib/data-service';
import { val } from '@/lib/analytics';
import { toast } from 'sonner';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit';

/** 12 个一级模块及其子页面的菜单权限树 */
const MENU_TREE = [
  {
    module: '工作台', key: 'workbench', pages: ['工作台总览'],
  },
  {
    module: '客户管理', key: 'customer', pages: ['客户列表', '客户详情', '新建客户', '编辑客户'],
  },
  {
    module: '广告业务', key: 'ad', pages: ['广告项目列表', '广告详情', '新建广告', '编辑广告'],
  },
  {
    module: '视频业务', key: 'video', pages: ['视频项目列表', '视频详情', '新建视频', '编辑视频'],
  },
  {
    module: '合同业务', key: 'contract', pages: ['合同列表', '合同详情', '新建合同', '编辑合同'],
  },
  {
    module: '财务管理', key: 'finance', pages: ['财务列表', '财务详情', '新建财务', '编辑财务'],
  },
  {
    module: '人资管理', key: 'hr', pages: ['员工列表', '员工详情', '新建员工', '编辑员工'],
  },
  {
    module: '行政管理', key: 'admin', pages: ['行政列表', '行政详情', '新建行政', '编辑行政'],
  },
  {
    module: '任务中心', key: 'task', pages: ['任务列表', '任务详情', '新建任务', '编辑任务'],
  },
  {
    module: '系统管理', key: 'system', pages: ['系统用户', '角色权限', '系统设置', '操作日志'],
  },
  {
    module: '业务支持', key: 'support', pages: ['工单列表', '工单详情', '新建工单', '编辑工单'],
  },
  {
    module: '报表中心', key: 'report', pages: ['自定义报表', '报表模板', '定时推送', '数据下钻'],
  },
];

function splitMenus(text: string): string[] {
  return text
    .split(/[,，、;；\n/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 系统管理 · 角色权限配置 */
export default function RoleMatrixPage() {
  const { records, loading } = useModuleData('role');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const toggleRole = (recordId: string) => {
    setExpandedRole((prev) => (prev === recordId ? null : recordId));
  };

  const startEdit = (recordId: string, currentMenus: string[]) => {
    setEditingPermissions((prev) => ({ ...prev, [recordId]: [...currentMenus] }));
    setExpandedRole(recordId);
  };

  const toggleModule = (recordId: string, moduleKey: string) => {
    setEditingPermissions((prev) => {
      const current = prev[recordId] ?? [];
      const modPages = MENU_TREE.find((m) => m.key === moduleKey)?.pages.map((p) => `${moduleKey}:${p}`) ?? [];
      const allSelected = modPages.every((p) => current.includes(p));
      if (allSelected) {
        return { ...prev, [recordId]: current.filter((p) => !modPages.includes(p)) };
      }
      return { ...prev, [recordId]: [...new Set([...current, ...modPages])] };
    });
  };

  const togglePage = (recordId: string, pageKey: string) => {
    setEditingPermissions((prev) => {
      const current = prev[recordId] ?? [];
      if (current.includes(pageKey)) {
        return { ...prev, [recordId]: current.filter((p) => p !== pageKey) };
      }
      return { ...prev, [recordId]: [...current, pageKey] };
    });
  };

  const savePermissions = async (recordId: string) => {
    const perms = editingPermissions[recordId];
    if (!perms) return;
    setSaving(true);
    try {
      // 将权限列表转为逗号分隔的字符串写回多维表格
      const permStr = perms.map((p) => {
        const [mod, page] = p.split(':', 2);
        const modName = MENU_TREE.find((m) => m.key === mod)?.module ?? mod;
        return `${modName}/${page}`;
      }).join(', ');
      await capabilityClient.load('mt-bitable').call('batchUpdateRecords', {
        tableId: 'tblgwOGNNtn2XiiF',
        records: [{ recordId, fields: { '菜单权限_文本': permStr } }],
      });
      toast.success('菜单权限已保存');
      setEditingPermissions((prev) => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });
    } catch (e) {
      logger.error('保存菜单权限失败:', String(e));
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = (recordId: string) => recordId in editingPermissions;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">角色权限配置</h2>
        <p className="mt-1 text-sm text-muted-foreground">系统角色、数据权限范围与菜单权限一览（展开角色可编辑菜单权限，点击「保存」写回多维表格）</p>
      </div>

      {records.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <ShieldQuestion className="size-8 text-muted-foreground/50" />
            <EmptyTitle>暂无角色数据</EmptyTitle>
            <EmptyDescription>请先在「角色权限」表中维护角色</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {records.map((r) => {
            const menus = splitMenus(val(r, 'role', '菜单权限'));
            const isExpanded = expandedRole === r.recordId;
            const isEditable = isEditing(r.recordId);
            const currentPerms = editingPermissions[r.recordId] ?? menus;

            return (
              <Card key={r.recordId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="size-4 text-primary" />
                    {val(r, 'role', '角色名称') || '未命名角色'}
                    {val(r, 'role', '状态') ? (
                      <Badge variant={val(r, 'role', '状态').includes('启用') ? 'secondary' : 'outline'} className="ml-auto text-[11px]">
                        {val(r, 'role', '状态')}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  {val(r, 'role', '角色编号') ? <p className="text-xs text-muted-foreground">编号：{val(r, 'role', '角色编号')}</p> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {val(r, 'role', '数据权限范围') ? (
                    <div className="text-xs">
                      <span className="text-muted-foreground">数据权限：</span>
                      <Badge variant="secondary" className="ml-1">{val(r, 'role', '数据权限范围')}</Badge>
                    </div>
                  ) : null}
                  <div className="text-xs">
                    <span className="text-muted-foreground">菜单权限（{isEditable ? currentPerms.length : menus.length}）：</span>
                    {!isEditable ? (
                      menus.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {menus.map((m) => (
                            <Badge key={m} variant="outline" className="font-normal">{m}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">未配置</span>
                      )
                    ) : null}
                  </div>

                  {/* 编辑模式：展开菜单权限树 */}
                  {(isExpanded || isEditable) && (
                    <div className="mt-2 rounded border p-2 max-h-[320px] overflow-y-auto text-xs">
                      {MENU_TREE.map((mod) => {
                        const modPages = mod.pages.map((p) => `${mod.key}:${p}`);
                        const selected = modPages.filter((p) => currentPerms.includes(p));
                        const allSelected = selected.length === modPages.length;
                        const partial = selected.length > 0 && !allSelected;

                        return (
                          <div key={mod.key} className="mb-1.5">
                            <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
                              <Checkbox
                                checked={allSelected}
                                data-state={partial ? 'indeterminate' : undefined}
                                onCheckedChange={() => isEditable ? toggleModule(r.recordId, mod.key) : null}
                                disabled={!isEditable || saving}
                                className="size-3.5"
                              />
                              <span className="font-medium">{mod.module}</span>
                            </div>
                            <div className="ml-5 mt-0.5 space-y-0.5">
                              {mod.pages.map((page) => {
                                const pageKey = `${mod.key}:${page}`;
                                const checked = currentPerms.includes(pageKey);
                                return (
                                  <div key={pageKey} className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-muted/30">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => isEditable ? togglePage(r.recordId, pageKey) : null}
                                      disabled={!isEditable || saving}
                                      className="size-3"
                                    />
                                    <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{page}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {val(r, 'role', '角色描述') ? <p className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">{val(r, 'role', '角色描述')}</p> : null}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-1">
                    {!isEditable ? (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => startEdit(r.recordId, menus)}>
                        <Settings className="size-3 mr-1" /> 编辑菜单权限
                      </Button>
                    ) : (
                      <>
                        <Button variant="default" size="sm" className="text-xs" disabled={saving} onClick={() => savePermissions(r.recordId)}>
                          <Save className="size-3 mr-1" /> {saving ? '保存中...' : '保存'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                          setEditingPermissions((prev) => {
                            const next = { ...prev };
                            delete next[r.recordId];
                            return next;
                          });
                          setExpandedRole(null);
                        }}>
                          取消
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