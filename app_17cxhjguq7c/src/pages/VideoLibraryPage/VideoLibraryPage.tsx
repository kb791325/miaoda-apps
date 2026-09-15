import { useEffect, useMemo, useState } from 'react';
import { Eye, Heart, MoreHorizontal, Search, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image } from '@/components/ui/image';
import ReportCard from '@/components/ReportCard';
import SectionHeader from '@/components/SectionHeader';
import { PublishStatusBadge } from '@/components/StatusBadge';
import { IVideo, PUBLISH_PLATFORMS, PUBLISH_STATUS_OPTIONS } from '@/data/videos';
import { fmtCount, fmtDuration } from '@/lib/format';
import { persistErrorText, updateVideo, useWorkshop } from '@/lib/store';

function PublishDialog({ open, onOpenChange, video }: { open: boolean; onOpenChange: (v: boolean) => void; video: IVideo | null }) {
  const [status, setStatus] = useState<IVideo['publishStatus']>('draft');
  const [platform, setPlatform] = useState('抖音');
  const [saving, setSaving] = useState(false);

  const current = video;

  useEffect(() => {
    if (open && video) {
      setStatus(video.publishStatus);
      setPlatform(video.publishPlatform || '抖音');
    }
  }, [open, video]);

  if (!current) return null;

  async function handleConfirm() {
    if (status === 'published' && !platform) {
      toast.error('已发布状态需选择发布平台');
      return;
    }
    setSaving(true);
    try {
      // 先写入多维表格，成功后才更新 UI / 关闭弹窗；失败保留选择供重试
      await updateVideo(current.id, { publishStatus: status, publishPlatform: status === 'published' ? platform : '' });
      toast.success(`「${current.videoTitle}」发布状态已更新`);
      onOpenChange(false);
    } catch (error) {
      toast.error(persistErrorText(error, '发布状态更新失败'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none p-6 sm:max-w-md">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">发布管理 · {current.videoTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">发布状态</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as IVideo['publishStatus'])}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {PUBLISH_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">发布平台{status === 'published' ? ' *' : ''}</Label>
            <Select value={platform} onValueChange={setPlatform} disabled={status !== 'published'}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {PUBLISH_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">取消</Button>
          <Button type="button" onClick={handleConfirm} disabled={saving} className="rounded-none">{saving ? '更新中…' : '确认更新'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VideoLibraryPage() {
  const { videos } = useWorkshop();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [publishTarget, setPublishTarget] = useState<IVideo | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return videos.filter(
      (v) =>
        (statusFilter === 'all' || v.publishStatus === statusFilter) &&
        (platformFilter === 'all' || v.publishPlatform === platformFilter) &&
        (!kw || v.videoTitle.toLowerCase().includes(kw) || v.linkedTask.toLowerCase().includes(kw) || v.tags.some((t) => t.toLowerCase().includes(kw))),
    );
  }, [videos, keyword, statusFilter, platformFilter]);

  const usedPlatforms = useMemo(() => ['all', ...PUBLISH_PLATFORMS.filter((p) => videos.some((v) => v.publishPlatform === p))], [videos]);

  function openPublish(video: IVideo) {
    setPublishTarget(video);
    setPublishOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeader number="03" title="视频成品库" subtitle="Generated video deliverables" />
        <div className="mb-6 shrink-0 text-right text-[10px] font-bold text-slate-400">
          共 {videos.length} 个成品 · 发布 {videos.filter((v) => v.publishStatus === 'published').length} 个
        </div>
      </div>

      {/* 筛选面板 */}
      <ReportCard className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索标题 / 关联任务 / 标签" className="rounded-none pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full rounded-none md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">全部状态</SelectItem>
              {PUBLISH_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-full rounded-none md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">全部平台</SelectItem>
              {usedPlatforms.filter((p) => p !== 'all').map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-[10px] font-bold text-slate-400">显示 {filtered.length} / {videos.length}</div>
        </div>
      </ReportCard>

      {/* 视频卡片网格 */}
      {filtered.length === 0 ? (
        <ReportCard className="py-16 text-center text-[11px] font-medium text-slate-400">当前筛选条件下没有成品视频</ReportCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((video) => (
            <ReportCard key={video.id} className="flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md">
              <div className="relative aspect-video w-full bg-slate-100">
                <Image src={video.coverImage} alt={video.videoTitle} className="size-full object-cover" />
                <span className="absolute bottom-2 right-2 rounded-[2px] bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {fmtDuration(video.duration)}
                </span>
                <span className="absolute left-2 top-2"><PublishStatusBadge status={video.publishStatus} /></span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{video.videoTitle}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 rounded-none">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-none">
                      <DropdownMenuItem onClick={() => openPublish(video)}>
                        <Send className="size-3.5" /> 发布管理
                      </DropdownMenuItem>
                      {video.publishStatus === 'published' && (
                        <DropdownMenuItem onClick={() => {
                          void (async () => {
                            toast.info('正在撤回发布…');
                            try {
                              // 等待多维表格写入成功后才提示，失败展示具体错误
                              await updateVideo(video.id, { publishStatus: 'withdrawn', publishPlatform: '' });
                              toast.success(`「${video.videoTitle}」已撤回`);
                            } catch (error) {
                              toast.error(persistErrorText(error, '撤回失败'));
                            }
                          })();
                        }}>
                          撤回发布
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1 text-[10px] font-medium text-slate-400">
                  {video.generationModel} · {video.resolution} · {video.generationTime}
                </div>
                <div className="mt-3 flex items-center gap-4 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><Eye className="size-3 text-slate-400" /> {fmtCount(video.playCount)}</span>
                  <span className="flex items-center gap-1"><Heart className="size-3 text-slate-400" /> {fmtCount(video.likeCount)}</span>
                  {video.publishPlatform && <span className="ml-auto text-[#0033A0]">{video.publishPlatform}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#E2E8F0] pt-3">
                  {video.tags.map((tag) => (
                    <span key={tag} className="rounded-[2px] bg-[#0033A0]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0033A0]">{tag}</span>
                  ))}
                </div>
              </div>
            </ReportCard>
          ))}
        </div>
      )}

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} video={publishTarget} />
    </div>
  );
}
