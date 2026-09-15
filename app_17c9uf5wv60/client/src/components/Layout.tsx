import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Sparkles,
  ClipboardList,
  Menu,
  X,
  Building2,
  ShoppingCart,
  Truck,
  FileText,
  RefreshCw,
  Users,
  Shield,
  DatabaseBackup,
  Moon,
  Sun,
  Keyboard,
} from 'lucide-react';
import { useRoles } from '@client/src/hooks/useRoles';
import { ThemeProvider, useTheme } from '@client/src/hooks/useTheme';
import {
  useGlobalShortcuts,
  SHORTCUT_LIST,
} from '@client/src/hooks/useAppShortcuts';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles?: string[];
  group?: string;
}

const allRoles = ['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'];

const navItems: NavItem[] = [
  { to: '/dashboard', label: '库存看板', icon: LayoutDashboard, roles: allRoles, group: '总览' },
  { to: '/operations', label: '库存操作', icon: Boxes, roles: ['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales'], group: '库存业务' },
  { to: '/records', label: '记录管理', icon: ClipboardList, roles: allRoles, group: '库存业务' },
  { to: '/products', label: '商品管理', icon: Package, roles: ['boss', 'supervisor', 'warehouse_admin'], group: '库存业务' },
  { to: '/ai-tools', label: 'AI 工具', icon: Sparkles, roles: ['boss', 'supervisor', 'warehouse_admin'], group: 'AI 智能' },
  { to: '/sales-orders', label: '销售订单', icon: ShoppingCart, roles: ['boss', 'supervisor', 'warehouse_admin', 'sales'], group: '订单中心' },
  { to: '/purchase-orders', label: '采购订单', icon: Truck, roles: ['boss', 'supervisor', 'warehouse_admin', 'purchaser'], group: '订单中心' },
  { to: '/suppliers', label: '供应商管理', icon: Building2, roles: ['boss', 'supervisor', 'warehouse_admin', 'purchaser'], group: '订单中心' },
  { to: '/audit-logs', label: '审计日志', icon: FileText, roles: ['boss', 'supervisor'], group: '系统管理' },
  { to: '/sync-settings', label: '飞书同步', icon: RefreshCw, roles: ['boss', 'supervisor'], group: '系统管理' },
  { to: '/users', label: '用户管理', icon: Users, roles: ['boss'], group: '系统管理' },
  { to: '/roles', label: '角色管理', icon: Shield, roles: ['boss'], group: '系统管理' },
  { to: '/backup', label: '数据备份', icon: DatabaseBackup, roles: ['boss', 'supervisor'], group: '系统管理' },
];

const GROUP_ORDER: string[] = ['总览', '库存业务', 'AI 智能', '订单中心', '系统管理'];

const NavItemGroup = ({ items, group }: { items: NavItem[]; group: string }) => {
  const { isLoading } = useRoles();
  if (isLoading) return null;
  return (
    <div className="pt-3 mt-2 border-t border-sidebar-border/60 first:border-t-0 first:mt-0 first:pt-0">
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
        {group}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </div>
    </div>
  );
};

const NavGroupRenderer = ({ items }: { items: NavItem[] }) => {
  const { isLoading } = useRoles();
  const visibleGroups: string[] = GROUP_ORDER.filter((group) =>
    items.some((item) => item.group === group),
  );
  void isLoading;

  return (
    <>
      {visibleGroups.map((group) => (
        <NavItemGroup
          key={group}
          group={group}
          items={items.filter((item) => item.group === group)}
        />
      ))}
    </>
  );
};
const NavItemSkeleton = () => (
  <div className="flex items-center gap-2.5 px-3 py-2">
    <div className="size-4 rounded-sm bg-muted animate-pulse" />
    <div className="h-4 w-16 rounded-sm bg-muted animate-pulse" />
  </div>
);

const NAV_LINK_BASE =
  'group/nav relative flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm transition-colors';
const NAV_LINK_ACTIVE = 'bg-primary text-primary-foreground font-medium shadow-sm';
const NAV_LINK_IDLE =
  'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

const NavItemLink = ({ item }: { item: NavItem }) => {
  const { hasRole, isLoading } = useRoles();
  if (isLoading) return <NavItemSkeleton />;
  if (!item.roles || !hasRole(item.roles)) return null;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `${NAV_LINK_BASE} ${isActive ? NAV_LINK_ACTIVE : NAV_LINK_IDLE}`
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-sm transition-colors ${
              isActive ? 'bg-primary-foreground' : 'bg-transparent'
            }`}
          />
          <item.icon className="size-4 shrink-0" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
};

const MobileNavItem = ({ item, onClose }: { item: NavItem; onClose: () => void }) => {
  const { hasRole, isLoading } = useRoles();
  if (isLoading) return <NavItemSkeleton />;
  if (!item.roles || !hasRole(item.roles)) return null;
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) =>
        `${NAV_LINK_BASE} ${isActive ? NAV_LINK_ACTIVE : NAV_LINK_IDLE}`
      }
    >
      <item.icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
};

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useGlobalShortcuts();

  return (
    <ThemeProvider>
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside className="hidden md:flex w-56 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Boxes className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground tracking-tight truncate">
                智能库存管理
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                数据驱动 · 智能决策
              </p>
            </div>
          </div>
          <div className="mt-3 hidden md:flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <GlobalSearch />
            </div>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <NavGroupRenderer items={navItems} />
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground"
            onClick={() => setHelpOpen(true)}
          >
            <Keyboard className="size-3.5" />
            快捷键说明（Ctrl/⌘ + N/F/E/S）
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        <div className="max-w-[1400px] mx-auto p-6">
          <Outlet />
        </div>
      </main>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4 border-b border-sidebar-border bg-sidebar">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 text-foreground"
        >
          {mobileOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </button>
        <span className="ml-3 text-sm font-semibold text-foreground">
          智能库存管理
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-12 bg-black/20">
            <nav className="w-56 h-full bg-sidebar border-r border-sidebar-border p-2 space-y-0.5 overflow-y-auto">
              <NavGroupRenderer items={navItems} />
            </nav>
        </div>
      )}

      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
    </ThemeProvider>
  );
};

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      onClick={toggleTheme}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
};

const ShortcutsHelpDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="size-4" />
          快捷键说明
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-2 py-2">
        {SHORTCUT_LIST.map((item) => (
          <div
            key={item.keys}
            className="flex items-center justify-between gap-4 rounded-sm border border-border px-3 py-2"
          >
            <span className="text-sm text-foreground">{item.description}</span>
            <kbd className="shrink-0 rounded-sm border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {item.keys}
            </kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default Layout;
