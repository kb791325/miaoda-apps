import { useState } from 'react';
import { t } from '@/lib/i18n';
import { avatarImages, scopedStorage } from '@lark-apaas/client-toolkit';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SlidersHorizontal, Bell, Globe, Palette, Clock, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/context/AppContext';
import { ROLE_LABELS } from '@/config/permissions';
import { getLang, setLang, useLang, type Lang } from '@/lib/i18n';
import { Image } from '@/components/ui/image';

const AVATAR_OPTIONS = [
  avatarImages.avatarImg1, avatarImages.avatarImg2, avatarImages.avatarImg3,
  avatarImages.avatarImg4, avatarImages.avatarImg5, avatarImages.avatarImg6,
  avatarImages.avatarImg7, avatarImages.avatarImg8,
];

const NOTIFY_ITEMS = [
  { key: 'announcement', title: '系统公告', desc: '接收系统公告和维护通知', def: true },
  { key: 'approval', title: '审批通知', desc: '待审批事项实时提醒', def: true },
  { key: 'business', title: '业务提醒', desc: '客户余额预警、合同到期提醒', def: true },
  { key: 'feishu', title: '飞书推送', desc: '消息同步到飞书', def: false },
  { key: 'email', title: '邮件通知', desc: '重要事项邮件通知', def: true },
];

const STORE_PROFILE = 'mutang_profile_extra';

function loadProfileExtra(): Record<string, string> {
  try {
    return JSON.parse(scopedStorage.getItem(STORE_PROFILE) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export default function PersonalSettingsPage() {
  useLang();
  const { user, setUser, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [tab, setTab] = useState('basic');
  const [lang, setLangState] = useState<Lang>(getLang());

  // 基本信息表单
  const [profile, setProfile] = useState(() => ({
    name: user?.name || '',
    phone: loadProfileExtra().phone || '13800138000',
    email: loadProfileExtra().email || `${user?.username || 'user'}@mutang.com`,
    gender: loadProfileExtra().gender || 'male',
  }));
  const [profileError, setProfileError] = useState('');
  const [saving, setSaving] = useState(false);

  // 头像
  const [avatarOpen, setAvatarOpen] = useState(false);

  // 安全设置
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ old: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [feishuBound, setFeishuBound] = useState(true);
  const [unbindOpen, setUnbindOpen] = useState(false);
  const [twoFa, setTwoFa] = useState(() => scopedStorage.getItem('mutang_2fa') === '1');

  // 消息通知
  const [notify, setNotify] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    NOTIFY_ITEMS.forEach((n) => { base[n.key] = n.def; });
    try {
      const saved = JSON.parse(scopedStorage.getItem('mutang_notify') || '{}') as Record<string, boolean>;
      return { ...base, ...saved };
    } catch {
      return base;
    }
  });

  // 显示偏好
  const [timezone, setTimezone] = useState(() => scopedStorage.getItem('mutang_timezone') || 'beijing');

  const displayName = user?.name || '未登录用户';
  const roleLabel = user ? ROLE_LABELS[user.role] || user.role : '—';

  const handleChangeLang = (v: Lang) => {
    setLangState(v);
    setLang(v);
    toast.success(v === 'zh' ? '已切换为简体中文' : 'Switched to English');
  };

  const handlePickAvatar = (url: string) => {
    if (!user) return;
    setUser({ ...user, avatar: url });
    scopedStorage.setItem('mutang_avatar', url);
    setAvatarOpen(false);
    toast.success('头像已更换');
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) { setProfileError('姓名不能为空'); return; }
    if (!/^1[3-9]\d{9}$/.test(profile.phone)) { setProfileError('请输入正确的 11 位手机号'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) { setProfileError('请输入正确的邮箱格式'); return; }
    setProfileError('');
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    if (user) setUser({ ...user, name: profile.name.trim() });
    scopedStorage.setItem(STORE_PROFILE, JSON.stringify({
      phone: profile.phone, email: profile.email, gender: profile.gender,
    }));
    toast.success('个人信息已保存');
  };

  const handleSubmitPwd = async () => {
    if (!pwd.old || !pwd.next || !pwd.confirm) { setPwdError('请完整填写三项密码信息'); return; }
    if (pwd.next.length < 6) { setPwdError('新密码长度不能少于 6 位'); return; }
    if (pwd.next !== pwd.confirm) { setPwdError('两次输入的新密码不一致'); return; }
    setPwdError('');
    setPwdSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setPwdSubmitting(false);
    setPwdOpen(false);
    setPwd({ old: '', next: '', confirm: '' });
    toast.success('密码修改成功，下次登录请使用新密码');
  };

  const handleConfirmUnbind = () => {
    setFeishuBound(false);
    setUnbindOpen(false);
    toast.success('已解绑飞书账号，后续将无法使用飞书登录');
  };

  const handleToggleTwoFa = (v: boolean) => {
    setTwoFa(v);
    scopedStorage.setItem('mutang_2fa', v ? '1' : '0');
    toast.success(`两步验证已${v ? '开启' : '关闭'}`);
  };

  const handleNotifyChange = (key: string, title: string, v: boolean) => {
    const next = { ...notify, [key]: v };
    setNotify(next);
    scopedStorage.setItem('mutang_notify', JSON.stringify(next));
    toast.success(`${title}已${v ? '开启' : '关闭'}`);
  };

  const handleTimezoneChange = (v: string) => {
    setTimezone(v);
    scopedStorage.setItem('mutang_timezone', v);
    toast.success('时区设置已生效');
  };

  const handleSidebarDefault = (v: boolean) => {
    setSidebarCollapsed(v);
    toast.success(`侧边栏默认状态已设为${v ? '折叠' : '展开'}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('个人设置')} description={t('修改个人信息和偏好设置')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={displayName}
                  className="size-20 rounded-full border border-border/50 object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground">
                  {displayName.slice(0, 1)}
                </div>
              )}
              <div className="mt-3 text-base font-semibold">{displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
              <Button variant="outline" size="sm" className="mt-3 h-8 w-full" onClick={() => setAvatarOpen(true)}>
                更换头像
              </Button>
            </div>
            <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>部门</span>
                <span className="text-foreground">{user?.department || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>岗位</span>
                <span className="text-foreground">{user?.position || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>登录账号</span>
                <span className="text-foreground">{user?.username || '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-3">
          <Tabs defaultValue="basic" value={tab} onValueChange={setTab}>
            <CardHeader className="pb-0">
              <TabsList className="h-9 bg-muted/50">
                <TabsTrigger value="basic" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <SlidersHorizontal className="mr-1 size-3.5" />基本信息
                </TabsTrigger>
                <TabsTrigger value="security" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Bell className="mr-1 size-3.5" />安全设置
                </TabsTrigger>
                <TabsTrigger value="notify" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Globe className="mr-1 size-3.5" />消息通知
                </TabsTrigger>
                <TabsTrigger value="display" className="h-8 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Palette className="mr-1 size-3.5" />显示偏好
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-4">
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm">姓名</Label>
                    <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">手机号</Label>
                    <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">邮箱</Label>
                    <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">性别</Label>
                    <Select value={profile.gender} onValueChange={(v) => setProfile((p) => ({ ...p, gender: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男</SelectItem>
                        <SelectItem value="female">女</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {profileError && <p className="text-xs text-destructive">{profileError}</p>}
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? '保存中…' : '保存修改'}
                </Button>
              </TabsContent>

              <TabsContent value="security" className="mt-0 space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <div className="font-medium">修改密码</div>
                    <div className="mt-1 text-xs text-muted-foreground">定期更换密码，保障账户安全</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPwdOpen(true)}>立即修改</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <div className="font-medium">绑定飞书</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {feishuBound ? '已绑定飞书账号，可使用飞书登录' : '未绑定飞书账号'}
                    </div>
                  </div>
                  {feishuBound ? (
                    <Button variant="outline" size="sm" onClick={() => setUnbindOpen(true)}>解绑</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { setFeishuBound(true); toast.success('已重新绑定飞书账号'); }}>
                      重新绑定
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <div className="font-medium">两步验证</div>
                    <div className="mt-1 text-xs text-muted-foreground">启用后登录需要额外验证</div>
                  </div>
                  <Switch checked={twoFa} onCheckedChange={handleToggleTwoFa} />
                </div>
              </TabsContent>

              <TabsContent value="notify" className="mt-0 space-y-3">
                {NOTIFY_ITEMS.map((n) => (
                  <div key={n.key} className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{n.desc}</div>
                    </div>
                    <Switch checked={notify[n.key]} onCheckedChange={(v) => handleNotifyChange(n.key, n.title, v)} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="display" className="mt-0 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Globe className="size-5 text-primary" />
                    <div>
                      <div className="font-medium">语言设置</div>
                      <div className="mt-1 text-xs text-muted-foreground">切换系统显示语言，即时生效</div>
                    </div>
                  </div>
                  <Select value={lang} onValueChange={(v) => handleChangeLang(v as Lang)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">简体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-primary" />
                    <div>
                      <div className="font-medium">时区</div>
                      <div className="mt-1 text-xs text-muted-foreground">系统显示时区</div>
                    </div>
                  </div>
                  <Select value={timezone} onValueChange={handleTimezoneChange}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beijing">北京 (UTC+8)</SelectItem>
                      <SelectItem value="tokyo">东京 (UTC+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="size-5 text-primary" />
                    <div>
                      <div className="font-medium">侧边栏默认折叠</div>
                      <div className="mt-1 text-xs text-muted-foreground">进入系统时侧边栏是否折叠，即时生效</div>
                    </div>
                  </div>
                  <Switch checked={sidebarCollapsed} onCheckedChange={handleSidebarDefault} />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* 更换头像弹窗 */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>更换头像</DialogTitle>
            <DialogDescription>选择一个预设头像，保存后立即生效</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 py-2">
            {AVATAR_OPTIONS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePickAvatar(url)}
                className={`overflow-hidden rounded-full border-2 transition ${user?.avatar === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/40'}`}
              >
                <Image src={url} alt={`头像${i + 1}`} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvatarOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改密码弹窗 */}
      <Dialog open={pwdOpen} onOpenChange={(o) => { setPwdOpen(o); if (!o) setPwdError(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">原密码</label>
              <Input type="password" placeholder="请输入原密码" value={pwd.old} onChange={(e) => setPwd((p) => ({ ...p, old: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">新密码</label>
              <Input type="password" placeholder="请输入新密码（不少于 6 位）" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">确认新密码</label>
              <Input type="password" placeholder="请再次输入新密码" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
            </div>
            {pwdError && <p className="text-xs text-destructive">{pwdError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>取消</Button>
            <Button onClick={handleSubmitPwd} disabled={pwdSubmitting}>
              {pwdSubmitting ? '提交中…' : '确定修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解绑飞书确认 */}
      <AlertDialog open={unbindOpen} onOpenChange={setUnbindOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解绑飞书账号？</AlertDialogTitle>
            <AlertDialogDescription>
              解绑后将无法使用飞书授权登录本系统，且飞书消息推送将同步停止。可随时重新绑定。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnbind}>确认解绑</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
