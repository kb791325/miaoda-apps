import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import {
  LayoutGrid, List, Image as ImageIcon, Eye, MousePointerClick, Target, Upload,
  Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { materialsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { cn } from '@/lib/utils';
import { MaterialThumb, pickFirstAttachment, pickMediaUrl } from './MaterialMediaThumb';
import { MaterialUploadDialog, type MaterialEditingRow } from './MaterialUploadDialog';
import { Image } from '@client/src/components/ui/image';

const PLATFORM_OPTS = ['巨量千川', '腾讯广告', '磁力引擎', '小红书'];

interface MaterialRow {
  id: string;
  material_no?: string;
  material_name?: string;
  material_type?: string;
  customer_name?: string;
  platform?: string;
  tags?: string;
  exposure?: number;
  clicks?: number;
  conversion?: number;
  material_file?: MaterialAttachmentList | null;
  video_cover?: MaterialAttachmentList | null;
  [key: string]: unknown;
}

type MaterialAttachmentList = { file_token: string; name?: string; size?: number; url?: string; tmp_url?: string }[];


const fmtNum = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n));

export function MaterialPage() {
  const [view, setView] = useState<'card' | 'list'>('card');
  const [kwInput, setKwInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialEditingRow | null>(null);
  const [preview, setPreview] = useState<MaterialRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const table = useServerList({ fetchFn: materialsApi.list, defaultPageSize: 12 });
  const loading = table.loading;
  const rows = (table.data || []) as MaterialRow[];

  useEffect(() => {
    const timer = setTimeout(() => {
      table.setFilters({
        keyword: kwInput.trim() || undefined,
        material_type: typeFilter === 'all' ? undefined : typeFilter,
        platform: platformFilter === 'all' ? undefined : platformFilter,
      });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kwInput, typeFilter, platformFilter]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (m: MaterialRow) => {
    setEditing(m as MaterialEditingRow);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await materialsApi.remove(deleteTarget.id);
      if (res.code === 0) {
        toast.success('素材已删除');
        table.refresh();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const renderThumb = (m: MaterialRow, className: string, showPlayBadge?: boolean) => (
    <MaterialThumb
      materialType={String(m.material_type || 'image')}
      attachments={m.material_file as MaterialRow['material_file']}
      cover={pickFirstAttachment(m.video_cover)}
      name={String(m.material_name || '')}
      showPlayBadge={showPlayBadge}
      className={className}
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t('素材库')} description={t('管理广告素材资源，支持卡片与列表两种视图')} />

      <Card className="shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Input
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            placeholder="搜索素材名称 / 编号"
            className="w-60 bg-background"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="素材类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="image">图片</SelectItem>
              <SelectItem value="video">视频</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="投放平台" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              {PLATFORM_OPTS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView('card')}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors',
                  view === 'card' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid className="size-3.5" /> 卡片
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors',
                  view === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <List className="size-3.5" /> 列表
              </button>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Upload className="size-3.5" /> 上传素材
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="shadow-sm"><CardContent className="py-16 text-center text-sm text-muted-foreground">加载中…</CardContent></Card>
      ) : view === 'card' ? (
        rows.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <ImageIcon className="size-10 opacity-40" />
              <div className="text-sm">暂无匹配素材</div>
              <div className="text-xs opacity-70">可调整筛选条件后重试</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((m) => (
              <Card key={m.id} className="group cursor-pointer overflow-hidden shadow-sm transition-shadow hover:shadow-md" onClick={() => setPreview(m)}>
                <div className="relative h-40">
                  {renderThumb(m, 'h-40 w-full', true)}
                  <StatusBadge
                    status={m.material_type === 'image' ? '图片' : '视频'}
                    variant={m.material_type === 'image' ? 'info' : 'default'}
                    className="absolute right-2 top-2 bg-background/90"
                  />
                </div>
                <CardContent className="space-y-2.5 p-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.material_name}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.customer_name} · {m.platform}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {String(m.tags || '').split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                      <span key={tag} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">{tag.trim()}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1 border-t border-border/60 pt-2.5 text-center">
                    <div>
                      <div className="text-xs font-semibold tabular-nums">{fmtNum(Number(m.exposure || 0))}</div>
                      <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                        <Eye className="size-3" /> 曝光
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold tabular-nums">{fmtNum(Number(m.clicks || 0))}</div>
                      <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                        <MousePointerClick className="size-3" /> 点击
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold tabular-nums">{Number(m.conversion || 0).toFixed(1)}%</div>
                      <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                        <Target className="size-3" /> 转化
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                      <Pencil className="size-3.5" /> 编辑
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                      <Trash2 className="size-3.5" /> 删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="shadow-sm">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">素材</TableHead>
                  <TableHead className="whitespace-nowrap">素材名称</TableHead>
                  <TableHead className="whitespace-nowrap">类型</TableHead>
                  <TableHead className="whitespace-nowrap">关联客户</TableHead>
                  <TableHead className="whitespace-nowrap">投放平台</TableHead>
                  <TableHead className="whitespace-nowrap text-right">曝光量</TableHead>
                  <TableHead className="whitespace-nowrap text-right">点击量</TableHead>
                  <TableHead className="whitespace-nowrap text-right">转化率</TableHead>
                  <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">暂无匹配素材</TableCell>
                  </TableRow>
                ) : rows.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => setPreview(m)}>
                    <TableCell>{renderThumb(m, 'h-10 w-14 rounded', true)}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{m.material_name}</TableCell>
                    <TableCell><StatusBadge status={m.material_type === 'image' ? '图片' : '视频'} variant={m.material_type === 'image' ? 'info' : 'default'} /></TableCell>
                    <TableCell className="max-w-[160px] truncate">{m.customer_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.platform}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(Number(m.exposure || 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(Number(m.clicks || 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(m.conversion || 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Pencil className="size-3.5" /> 编辑
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                          <Trash2 className="size-3.5" /> 删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <MaterialUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => table.refresh()}
      />

      <Dialog open={preview !== null} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.material_name}</DialogTitle>
            <DialogDescription>{preview?.customer_name} · {preview?.platform}</DialogDescription>
          </DialogHeader>
          {preview ? (() => {
            const att = pickFirstAttachment(preview.material_file);
            const url = pickMediaUrl(att);
            if (!url) {
              return <div className="flex h-64 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">暂无可预览的文件</div>;
            }
            return preview.material_type === 'video' ? (
              <video src={url} controls autoPlay className="max-h-[70vh] w-full rounded-lg bg-black" />
            ) : (
              <Image src={url} alt={String(preview.material_name || '')} className="max-h-[70vh] w-full rounded-lg object-contain" />
            );
          })() : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除素材</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.material_name}」，该操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); handleDelete(); }}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
