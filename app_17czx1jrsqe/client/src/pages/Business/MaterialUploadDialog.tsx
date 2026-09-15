import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { materialsApi } from '@/api';
import { uploadMedia } from '@/utils/media-upload';
import { MAX_UPLOAD_SIZE } from './MaterialMedia';
import {
  ImageUploadArea, VideoUploadArea, toFileItem, toRemoteItem,
  type UploadItem,
} from './MaterialUploadAreas';

const PLATFORM_OPTS = ['巨量千川', '腾讯广告', '磁力引擎', '小红书'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const VIDEO_EXTS = ['mp4', 'mov', 'webm'];

interface RowAttachment {
  file_token: string;
  name?: string;
  size?: number;
  url?: string;
  tmp_url?: string;
}

export interface MaterialEditingRow {
  id: string;
  material_name?: string;
  material_type?: string;
  customer_name?: string;
  platform?: string;
  tags?: string;
  remark?: string;
  material_file?: RowAttachment[] | null;
  video_cover?: RowAttachment[] | null;
}

interface MaterialUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MaterialEditingRow | null;
  onSaved: () => void;
}

const extOf = (name: string): string => (name.split('.').pop() || '').toLowerCase();

const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || IMAGE_EXTS.includes(extOf(file.name));

const isVideoFile = (file: File): boolean =>
  file.type.startsWith('video/') || VIDEO_EXTS.includes(extOf(file.name));

const toUploadItems = (atts: RowAttachment[] | null | undefined): UploadItem[] =>
  (atts || [])
    .filter((a: RowAttachment) => !!a.file_token)
    .map((a: RowAttachment) =>
      toRemoteItem({
        file_token: a.file_token,
        name: a.name || '',
        size: a.size || 0,
        url: a.url || a.tmp_url,
      }),
    );

export function MaterialUploadDialog({ open, onOpenChange, editing, onSaved }: MaterialUploadDialogProps) {
  const [name, setName] = useState('');
  const [materialType, setMaterialType] = useState<'image' | 'video'>('image');
  const [customer, setCustomer] = useState('');
  const [platform, setPlatform] = useState('巨量千川');
  const [tags, setTags] = useState('');
  const [remark, setRemark] = useState('');
  const [images, setImages] = useState<UploadItem[]>([]);
  const [video, setVideo] = useState<UploadItem | null>(null);
  const [cover, setCover] = useState<UploadItem | null>(null);
  const [saving, setSaving] = useState(false);
  const blobRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setName(editing?.material_name || '');
    setMaterialType(editing?.material_type === 'video' ? 'video' : 'image');
    setCustomer(editing?.customer_name || '');
    setPlatform(editing?.platform || '巨量千川');
    setTags(editing?.tags || '');
    setRemark(editing?.remark || '');
    const isVideo = editing?.material_type === 'video';
    const fileItems = toUploadItems(editing?.material_file);
    setImages(!isVideo ? fileItems : []);
    setVideo(isVideo ? fileItems[0] || null : null);
    setCover(toUploadItems(editing?.video_cover)[0] || null);
  }, [open, editing]);

  useEffect(() => {
    if (open) return;
    const stale: string[] = [
      ...images.map((it: UploadItem) => it.previewUrl || ''),
      video?.previewUrl || '',
      cover?.previewUrl || '',
    ].filter((u: string) => u.startsWith('blob:'));
    for (const u of stale) revokeLater(u);
  }, [open]);

  const patchImage = (key: string, patch: Partial<UploadItem>) => {
    setImages((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const handleImagePick = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!isImageFile(file)) {
        toast.error(`不支持的图片格式：${file.name}，仅支持 image/* 图片文件`);
        continue;
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        toast.error(`图片超过 25MB：${file.name}`);
        continue;
      }
      const item = toFileItem(file);
      trackBlob(item.previewUrl);
      setImages((prev) => [...prev, item]);
      uploadMedia(file, (pct: number) => patchImage(item.key, { progress: pct }))
        .then((res) => patchImage(item.key, { token: res.file_token, progress: 100 }))
        .catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : `上传失败：${file.name}`);
          setImages((prev) => prev.filter((it) => it.key !== item.key));
          revokeLater(item.previewUrl);
        });
    }
  };

  const trackBlob = (url?: string) => {
    if (url && url.startsWith('blob:')) blobRef.current.add(url);
  };

  const revokeLater = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      blobRef.current.delete(url);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => URL.revokeObjectURL(url));
      });
    }
  };

  useEffect(() => {
    return () => {
      for (const u of blobRef.current) {
        blobRef.current.delete(u);
        URL.revokeObjectURL(u);
      }
    };
  }, []);

  const removeImage = (key: string) => {
    const target = images.find((it) => it.key === key);
    setImages((prev) => prev.filter((it) => it.key !== key));
    revokeLater(target?.previewUrl);
  };

  type SingleSetter = (value: UploadItem | null | ((cur: UploadItem | null) => UploadItem | null)) => void;

  const handleSinglePick = (kind: 'video' | 'cover', files: FileList | null, setItem: SingleSetter) => {
    const file = files?.[0];
    if (!file) return;
    if (kind === 'video' && !isVideoFile(file)) {
      toast.error('不支持的视频格式，仅支持 video/* 视频文件');
      return;
    }
    if (kind === 'cover' && !isImageFile(file)) {
      toast.error('封面仅支持 image/* 图片文件');
      return;
    }
    if (kind === 'cover' && file.size > MAX_UPLOAD_SIZE) {
      toast.error('封面图片不能超过 25MB');
      return;
    }
    const item = toFileItem(file);
    trackBlob(item.previewUrl);
    setItem((cur) => {
      revokeLater(cur?.previewUrl);
      return item;
    });
    uploadMedia(file, (pct: number) =>
      setItem((cur) => (cur && cur.key === item.key ? { ...cur, progress: pct } : cur)))
      .then((res) => setItem((cur) =>
        (cur && cur.key === item.key ? { ...cur, token: res.file_token, progress: 100 } : cur)))
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : `上传失败：${file.name}`);
        setItem((cur) => (cur && cur.key === item.key ? null : cur));
      });
  };

  const removeSingle = (item: UploadItem | null, setItem: SingleSetter) => {
    setItem(null);
    revokeLater(item?.previewUrl);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入素材名称');
      return;
    }
    if (materialType === 'image' && images.length === 0) {
      toast.error('请至少上传 1 张图片');
      return;
    }
    if (materialType === 'image' && images.some((it: UploadItem) => !it.token)) {
      toast.error('存在尚未上传完成的图片，请稍候');
      return;
    }
    if (materialType === 'video' && !video) {
      toast.error('请上传 1 个视频文件');
      return;
    }
    if (materialType === 'video' && video && !video.token) {
      toast.error('视频尚未上传完成，请稍候');
      return;
    }
    if (cover && !cover.token) {
      toast.error('封面尚未上传完成，请稍候');
      return;
    }
    setSaving(true);
    try {
      const fileTokens: string[] = [];
      if (materialType === 'image') {
        for (const it of images) {
          if (it.token) fileTokens.push(it.token);
        }
      } else if (video?.token) {
        fileTokens.push(video.token);
      }
      const payload: Record<string, unknown> = {
        material_name: name.trim(),
        material_type: materialType,
        platform,
        customer_name: customer.trim() || '待关联',
        tags: tags.trim(),
        remark: remark.trim(),
        material_file: fileTokens.map((t: string) => ({ file_token: t })),
        video_cover: materialType === 'video' && cover?.token ? [{ file_token: cover.token }] : [],
      };
      if (!editing) {
        payload.material_no = `MT${Date.now().toString().slice(-5)}`;
        payload.exposure = 0;
        payload.clicks = 0;
        payload.conversion = 0;
      }
      const res = editing
        ? await materialsApi.update(editing.id, payload)
        : await materialsApi.create(payload);
      if (res.code !== 0) {
        toast.error(res.message || '保存失败');
        return;
      }
      toast.success(editing ? '素材已更新' : '素材上传成功');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑素材' : '上传素材'}</DialogTitle>
          <DialogDescription>
            {editing ? '可替换附件，保存后同步到素材库' : '填写素材基本信息并上传文件'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>素材名称 <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入素材名称" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>素材类型 <span className="text-destructive">*</span></Label>
              <Select value={materialType} onValueChange={(v) => setMaterialType(v as 'image' | 'video')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="video">视频</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>投放平台 <span className="text-destructive">*</span></Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>客户名称</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="请输入关联客户名称" />
            </div>
            <div className="space-y-1.5">
              <Label>标签</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="多个用逗号分隔" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} placeholder="选填" />
          </div>
          {materialType === 'image' ? (
            <ImageUploadArea images={images} onPick={handleImagePick} onRemove={removeImage} />
          ) : (
            <VideoUploadArea
              video={video}
              cover={cover}
              onPickVideo={(f) => handleSinglePick('video', f, setVideo)}
              onPickCover={(f) => handleSinglePick('cover', f, setCover)}
              onRemoveVideo={() => removeSingle(video, setVideo)}
              onRemoveCover={() => removeSingle(cover, setCover)}
            />
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="button" disabled={saving} onClick={handleSubmit}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? '保存' : '确认上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
