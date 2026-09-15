import { useRef } from 'react';
import { ImagePlus, Trash2, Upload, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Image } from '@client/src/components/ui/image';

export interface UploadItem {
  key: string;
  file: File | null;
  name: string;
  size: number;
  previewUrl?: string;
  remoteUrl?: string;
  token?: string;
  progress: number;
}

let itemSeq = 0;
export function nextItemKey(): string {
  return `item_${Date.now()}_${itemSeq++}`;
}

export function toRemoteItem(att: { file_token: string; name: string; size: number; url?: string }): UploadItem {
  return { key: nextItemKey(), file: null, name: att.name, size: att.size, remoteUrl: att.url, token: att.file_token, progress: 100 };
}

export function toFileItem(file: File): UploadItem {
  return { key: nextItemKey(), file, name: file.name, size: file.size, previewUrl: URL.createObjectURL(file), progress: 0 };
}

export function progressColor(it: UploadItem): string {
  return it.token || it.progress >= 100 ? 'bg-teal-600' : 'bg-primary';
}

function ProgressBar({ item }: { item: UploadItem }) {
  if (item.token) return null;
  return (
    <div className="h-1 overflow-hidden rounded bg-muted">
      <div className={cn('h-full transition-all', progressColor(item))} style={{ width: `${item.progress}%` }} />
    </div>
  );
}

interface ImageUploadAreaProps {
  images: UploadItem[];
  onPick: (files: FileList | null) => void;
  onRemove: (key: string) => void;
}

export function ImageUploadArea({ images, onPick, onRemove }: ImageUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">图片素材 <span className="text-destructive">*</span></label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(e) => { onPick(e.target.files); e.target.value = ''; }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files); }}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <ImagePlus className="size-5" />
        <span>点击或拖拽上传图片，可多选（image/*，单张 ≤25MB）</span>
      </div>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((it) => (
            <div key={it.key} className="group relative overflow-hidden rounded-md border border-border">
              <Image src={it.previewUrl || it.remoteUrl} alt={it.name} className="h-20 w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(it.key)}
                className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
              <div className="space-y-1 px-1.5 py-1">
                <div className="truncate text-[10px] text-muted-foreground">{it.name}</div>
                <ProgressBar item={it} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface VideoUploadAreaProps {
  video: UploadItem | null;
  cover: UploadItem | null;
  onPickVideo: (files: FileList | null) => void;
  onPickCover: (files: FileList | null) => void;
  onRemoveVideo: () => void;
  onRemoveCover: () => void;
}

export function VideoUploadArea({ video, cover, onPickVideo, onPickCover, onRemoveVideo, onRemoveCover }: VideoUploadAreaProps) {
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-3">
      <input
        ref={videoInputRef}
        type="file"
        accept=".mp4,.mov,.webm"
        className="hidden"
        onChange={(e) => { onPickVideo(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(e) => { onPickCover(e.target.files); e.target.value = ''; }}
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">视频文件 <span className="text-destructive">*</span></label>
        {video ? (
          <div className="space-y-2 rounded-lg border border-border p-2.5">
            {video.previewUrl || video.remoteUrl ? (
              <video src={video.previewUrl || video.remoteUrl} controls className="w-full rounded-md bg-black" />
            ) : null}
            <div className="flex items-center gap-2">
              <Video className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs">{video.name}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => videoInputRef.current?.click()}>更换</Button>
              <Button type="button" size="sm" variant="ghost" onClick={onRemoveVideo}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <ProgressBar item={video} />
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => videoInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter') videoInputRef.current?.click(); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onPickVideo(e.dataTransfer.files); }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Upload className="size-5" />
            <span>点击或拖拽上传视频（video/*，超过 25MB 自动分片上传）</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">封面图（可选）</label>
        {cover ? (
          <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <Image src={cover.previewUrl || cover.remoteUrl} alt={cover.name} className="size-10 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-xs">{cover.name}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => coverInputRef.current?.click()}>更换</Button>
            <Button type="button" size="sm" variant="ghost" onClick={onRemoveCover}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
            <ImagePlus className="size-3.5" /> 上传封面图
          </Button>
        )}
      </div>
    </div>
  );
}
