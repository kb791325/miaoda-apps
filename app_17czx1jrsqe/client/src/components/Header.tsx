import { useMemo, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Search,
  Bell,
  Maximize2,
  Globe,
  User,
  Settings,
  LogOut,
  KeyRound,
  ChevronRight,
  Shield,
  Briefcase,
  Building2,
  Check,
} from 'lucide-react';
import { scopedStorage } from '@lark-apaas/client-toolkit';
import { findBreadcrumb } from '@/config/menu';
import { useApp } from '@/context/AppContext';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { t, setLang, useLang } from '@/lib/i18n';
import { useGlobalSearch, type GlobalSearchItem } from '@/hooks/useGlobalSearch';
import { useRealAlerts } from '@/hooks/useRealAlerts';

interface NotificationItem {
  id: string;
  type: 'system' | 'approval' | 'warning';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

const BASE_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', type: 'approval', title: '开户审批待处理', content: '郑州星辰科技有限公司 巨量千川开户申请待您审批', read: false, createdAt: '10分钟前' },
  { id: 'n2', type: 'system', title: '系统更新通知', content: '系统将于今晚 22:00-23:00 进行例行维护', read: false, createdAt: '1小时前' },
  { id: 'n4', type: 'approval', title: '合同审批待处理', content: '郑州启明星电商 年度框架合同待您审批', read: true, createdAt: '昨天' },
  { id: 'n5', type: 'system', title: '新员工入职', content: '李明 已入职商务一部，请及时安排工位', read: true, createdAt: '昨天' },
];

const SEARCH_SUGGESTIONS = [
  { type: '客户', name: '郑州星辰科技有限公司', path: '/customer/customers/1' },
  { type: '客户', name: '河南华贸集团', path: '/customer/customers/2' },
  { type: '客户', name: '郑州启明星电子商务有限公司', path: '/customer/customers/3' },
  { type: '合同', name: '华贸集团年度框架合同', path: '/contract/contracts' },
  { type: '订单', name: '巨量千川-星辰科技8月订单', path: '/advertising/account-open' },
  { type: '员工', name: '张伟 - 商务一部', path: '/hr/employees' },
  { type: '员工', name: '李娜 - 商务二部', path: '/hr/employees' },
];

const SEARCH_HISTORY_KEY = 'mutang_search_history';

function loadSearchHistory(): string[] {
  try {
    const raw = scopedStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list.filter((s) => typeof s === 'string').slice(0, 8);
    }
  } catch { /* ignore */ }
  return [];
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  manager: '部门经理',
  sales: '商务',
  finance: '财务',
  hr: '人事',
};

const DATA_SCOPE_LABEL: Record<string, string> = {
  all: '全部数据',
  department: '本部门',
  'department_and_sub': '本部门及下级',
  self: '仅本人',
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const breadcrumb = useMemo(() => findBreadcrumb(pathname), [pathname]);
  const lang = useLang();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(loadSearchHistory);
  const searchRef = useRef<HTMLDivElement>(null);
  const { loading: searchLoading, results: searchResults, search: triggerGlobalSearch } = useGlobalSearch();
  const { alerts, refreshAlerts } = useRealAlerts();

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const saveSearchHistory = (kw: string) => {
    const word = kw.trim();
    if (!word) return;
    const next = [word, ...searchHistory.filter((h) => h !== word)].slice(0, 8);
    setSearchHistory(next);
    try {
      scopedStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    try {
      scopedStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch { /* ignore */ }
    toast.success(t('搜索历史已清空'));
  };

  const gotoSuggestion = (path: string) => {
    saveSearchHistory(searchKeyword);
    setSearchFocused(false);
    setSearchKeyword('');
    setActiveIdx(-1);
    navigate(path);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSuggestions.length === 0) {
      if (e.key === 'Escape') setSearchFocused(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIdx >= 0 ? filteredSuggestions[activeIdx] : filteredSuggestions[0];
      if (target) gotoSuggestion(target.path);
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
    }
  };

  const filteredSuggestions: GlobalSearchItem[] = useMemo(() => {
    if (!searchKeyword.trim()) {
      return SEARCH_SUGGESTIONS.slice(0, 5).map((s) => ({
        type: s.type,
        title: s.name,
        path: s.path,
        raw: {},
      }));
    }
    return searchResults;
  }, [searchKeyword, searchResults]);

  // 无关键词时联想列表只作展示，不参与键盘选择，避免与历史记录混淆

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success(t('已退出登录'));
    navigate('/login');
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const [readIds, setReadIds] = useState<string[]>([]);
  const [notifTab, setNotifTab] = useState<'system' | 'approval' | 'warning'>('approval');
  const notifications: NotificationItem[] = useMemo(
    () => [
      ...BASE_NOTIFICATIONS,
      ...alerts.map((a) => ({
        id: a.id,
        type: 'warning' as const,
        title: a.title,
        content: a.content,
        read: readIds.includes(a.id),
        createdAt: a.createdAt,
      })),
    ],
    [alerts, readIds],
  );
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.filter((n) => n.type === notifTab);
  const handleMarkAllRead = () => {
    setReadIds(notifications.map((n) => n.id));
    toast.success(t('全部已读'));
  };
  const handleReadOne = (id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="size-8" />
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          {breadcrumb.length > 0 && (
            <>
              <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/dashboard/workbench')}>
                {t('首页')}
              </span>
              {breadcrumb.map((item, idx) => (
                <span key={item.id} className="flex items-center gap-1">
                  <ChevronRight className="size-3" />
                  <span
                    className={
                      idx === breadcrumb.length - 1
                        ? 'font-medium text-foreground'
                        : 'cursor-pointer hover:text-foreground'
                    }
                    onClick={() => item.path && navigate(item.path)}
                  >
                    {t(item.title)}
                  </span>
                </span>
              ))}
            </>
          )}
        </nav>
      </div>

      <div className="relative w-full max-w-md" ref={searchRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setActiveIdx(-1);
              triggerGlobalSearch(e.target.value);
            }}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('搜索客户、合同、订单、员工...')}
            className="h-9 bg-muted/50 pl-9 text-sm"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden text-[10px] text-muted-foreground md:block">
            ⌘K
          </kbd>
        </div>
        {searchFocused && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            {!searchKeyword.trim() && searchHistory.length > 0 && (
              <>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">{t('搜索历史')}</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearSearchHistory}
                  >
                    {t('清空')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                  {searchHistory.map((h) => (
                    <button
                      key={h}
                      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      onClick={() => {
                        setSearchKeyword(h);
                        setActiveIdx(-1);
                      }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="mx-1 border-t border-border/60" />
              </>
            )}
            <div className="px-3 py-1.5 text-xs text-muted-foreground">
              {searchKeyword ? t('搜索结果') : t('热门搜索')}
            </div>
            {filteredSuggestions.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-muted-foreground">
                <Search className="size-5 opacity-40" />
                <span className="text-xs">{searchLoading ? t('搜索中...') : t('无相关结果')}</span>
              </div>
            ) : (
              filteredSuggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${item.path}-${idx}`}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                    idx === activeIdx && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => gotoSuggestion(item.path)}
                >
                  <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal">
                    {item.type}
                  </Badge>
                  <span className="flex-1 truncate text-left font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="ml-2 shrink-0 truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-9" onClick={handleFullscreen} title={t('全屏')}>
          <Maximize2 className="size-4" />
        </Button>

        <DropdownMenu onOpenChange={(open) => { if (open) refreshAlerts(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-9" title={t('消息通知')}>
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <Tabs value={notifTab} onValueChange={(v) => setNotifTab(v as 'system' | 'approval' | 'warning')} className="w-full">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">{t('消息通知')}</span>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={handleMarkAllRead}
                >
                  {t('全部已读')}
                </button>
              </div>
              <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
                <TabsTrigger value="system" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 text-xs">
                  {t('系统通知')}
                </TabsTrigger>
                <TabsTrigger value="approval" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 text-xs">
                  {t('审批提醒')}
                </TabsTrigger>
                <TabsTrigger value="warning" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 text-xs">
                  {t('预警信息')}
                </TabsTrigger>
              </TabsList>
              <div className="max-h-72 overflow-y-auto py-1">
                {visibleNotifications.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    {t(notifTab === 'warning' ? '暂无预警' : '暂无消息')}
                  </div>
                )}
                {visibleNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleReadOne(n.id)}
                  >
                    <div className={`mt-1 size-2 shrink-0 rounded-full ${n.read ? 'bg-border' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                          {t(n.type === 'system' ? '系统' : n.type === 'approval' ? '审批' : '预警')}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.content}
                      </p>
                      <div className="mt-1 text-[10px] text-muted-foreground/70">{n.createdAt}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="border-t p-2 text-center text-xs text-muted-foreground hover:text-primary cursor-pointer"
                onClick={() => navigate('/task/my-todo')}
              >
                {t('查看全部消息')}
              </div>
            </Tabs>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9" title={t('语言切换')}>
              <Globe className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => setLang('zh')}
            >
              简体中文
              {lang === 'zh' && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between"
              onClick={() => setLang('en')}
            >
              English
              {lang === 'en' && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pl-1 pr-2">
              <Avatar className="size-7">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-xs">
                  {user?.name?.slice(0, 1) || t('管')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm md:inline">{user?.name || t('管理员')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-sm">
                    {user?.name?.slice(0, 1) || t('管')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {user?.name || t('管理员')}
                  </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {t(user?.role ? ROLE_LABEL[user.role] || user.role : '超级管理员')}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="size-3 shrink-0" />
                    <span className="truncate">{user?.department || t('总部')}</span>
                    <span className="mx-1 text-border">·</span>
                    <Briefcase className="size-3 shrink-0" />
                    <span className="truncate">{user?.position || t('—')}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                <Shield className="size-3.5 shrink-0 text-primary" />
                <span>{t('数据范围')}：{t(user?.dataScope ? DATA_SCOPE_LABEL[user.dataScope] || user.dataScope : '全部数据')}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => navigate('/system/personal')}>
              <User className="size-4" /> {t('个人中心')}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => setPwdDialogOpen(true)}>
              <KeyRound className="size-4" /> {t('修改密码')}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => navigate('/system/settings/public-sea')}>
              <Settings className="size-4" /> {t('系统设置')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="size-4" /> {t('退出登录')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen} />
    </header>
  );
}
