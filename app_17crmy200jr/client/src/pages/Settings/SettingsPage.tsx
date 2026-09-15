import { useState, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Shield, ScrollText } from 'lucide-react';
import FeishuSyncPanel from './FeishuSyncPanel';
import PermissionUsersPanel from './PermissionUsersPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@client/src/components/ui/drawer';
import type {
  FeishuSyncConfigItem,
  FeishuSyncLogItem,
  RoleWithUserCount,
} from '@shared/api.interface';
import * as rolesApi from '@client/src/api/roles';

type MenuKey = 'feishu-sync' | 'permissions';

const menuItems: { key: MenuKey; label: string }[] = [
  { key: 'feishu-sync', label: '飞书同步配置' },
  { key: 'permissions', label: '权限管理' },
];

const SettingsPage = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('feishu-sync');

  // Permission tab roles data
  const [roles, setRoles] = useState<RoleWithUserCount[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await rolesApi.getRoleList();
      setRoles(data);
    } catch (err: unknown) {
      logger.error('加载角色列表失败', err);
      toast.error('加载角色列表失败');
    }
  }, []);

  useEffect(() => {
    if (activeMenu === 'permissions') {
      void fetchRoles();
    }
  }, [activeMenu, fetchRoles]);

  // Field mapping dialog state
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingDomain, setMappingDomain] = useState('');
  const [mappingList, setMappingList] = useState<
    { feishuField: string; localField: string }[]
  >([]);

  // Sync logs drawer state
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsDomain, setLogsDomain] = useState('');
  const [logsList, setLogsList] = useState<FeishuSyncLogItem[]>([]);

  const openFieldMapping = useCallback(
    (config: FeishuSyncConfigItem) => {
      setMappingDomain(config.domain);
      setMappingList(config.fieldMapping);
      setMappingOpen(true);
    },
    [],
  );

  const openSyncLogs = useCallback(
    (domain: string, logs: FeishuSyncLogItem[]) => {
      setLogsDomain(domain);
      setLogsList(logs);
      setLogsOpen(true);
    },
    [],
  );

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground mb-6">系统设置</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">系统基础配置管理</p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar menu */}
          <div className="w-52 shrink-0 rounded-sm border border-border bg-card p-2">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveMenu(item.key)}
              className={`relative flex w-full items-center rounded-sm px-3 py-2.5 text-left text-sm transition-colors ${
                activeMenu === item.key
                  ? 'bg-accent font-medium text-foreground/80'
                  : 'text-foreground/80 hover:bg-accent/50'
              }`}
            >
              {activeMenu === item.key && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-sm bg-primary" />
              )}
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeMenu === 'feishu-sync' && (
            <FeishuSyncPanel
              onFieldMapping={openFieldMapping}
              onViewLogs={openSyncLogs}
            />
          )}
          {activeMenu === 'permissions' && (
            <div className="space-y-4">
              <PermissionUsersPanel roles={roles} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NavLink
                  to="/roles"
                  className="block rounded-sm border border-border bg-card p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                      <Shield size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">角色与权限管理</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        管理系统角色、菜单权限、数据权限与操作权限
                      </div>
                    </div>
                  </div>
                </NavLink>

                <NavLink
                  to="/audit-logs"
                  className="block rounded-sm border border-border bg-card p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                      <ScrollText size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">操作审计日志</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        查看系统所有操作记录与审计追踪
                      </div>
                    </div>
                  </div>
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Field Mapping Dialog */}
      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="max-w-xl rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base">字段映射 - {mappingDomain}</DialogTitle>
            <DialogDescription className="text-xs">
              飞书多维表格字段与本地表字段映射关系
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                 <tr className="border-b border-border">
                  <th className="h-9 px-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    飞书字段
                  </th>
                  <th className="h-9 px-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    →
                  </th>
                  <th className="h-9 px-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    本地字段
                  </th>
                </tr>
              </thead>
              <tbody>
                {mappingList.map((item, idx) => (
                  <tr
                   key={`${item.feishuField}-${idx}`}
                   className="border-b border-border"
                  >
                    <td className="h-10 px-2 text-foreground">{item.feishuField}</td>
                    <td className="h-10 px-2 text-center text-muted-foreground">→</td>
                    <td className="h-10 px-2 text-foreground/80">{item.localField}</td>
                  </tr>
                ))}
                {mappingList.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="h-16 text-center text-sm text-muted-foreground"
                    >
                      暂无映射配置
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Logs Drawer */}
      <Drawer open={logsOpen} onOpenChange={setLogsOpen} direction="right">
        <DrawerContent className="w-[480px] rounded-none border-l">
           <DrawerHeader className="border-b border-border">
            <DrawerTitle className="text-base">同步日志 - {logsDomain}</DrawerTitle>
            <DrawerDescription className="text-xs">最近 10 条同步记录</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {logsList.map((log) => (
                <div
                  key={log.id}
                   className="rounded-sm border border-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {log.syncType}
                    </span>
                     <span
                       className={`inline-flex items-center gap-1.5 text-xs ${
                         log.status === 'success'
                           ? 'text-success'
                           : log.status === 'failed'
                           ? 'text-destructive'
                           : 'text-warning'
                       }`}
                     >
                       <span
                         className={`inline-block h-2 w-2 rounded-full ${
                           log.status === 'success'
                             ? 'bg-success'
                             : log.status === 'failed'
                             ? 'bg-destructive'
                             : 'bg-warning'
                         }`}
                       />
                      {log.status === 'success'
                        ? '成功'
                        : log.status === 'failed'
                        ? '失败'
                        : '同步中'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <div>方向: {log.direction}</div>
                    <div>记录数: {log.recordCount}</div>
                    <div>开始时间: {log.startTime}</div>
                    {log.endTime && <div>结束时间: {log.endTime}</div>}
                  </div>
                  {log.errorMessage && (
                    <div className="mt-2 text-xs text-destructive">
                      错误: {log.errorMessage}
                    </div>
                  )}
                </div>
              ))}
              {logsList.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  暂无同步日志
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default SettingsPage;
