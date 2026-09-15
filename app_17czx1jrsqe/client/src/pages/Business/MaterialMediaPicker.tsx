import { useRef } from 'react';
import { Play, Trash2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type { MaterialAttachment } from '@/api/media-upload-types';
import { Image } from '@client/src/components/ui/image';

export interface MediaItem {
  key: string;
  token: string;
  name: string;
  size: number;
  previewUrl: string;
  progress: number;
  existing: boolean;
}

export function toItems(atts: MaterialAttachment[] | null | undefined): MediaItem[] {
  return (atts || [])
    .filter((a) => a && a.file_token)
    .map((a, i) => ({
      key: `exist-${a.file_token}-${i}`,
      token: a.file_token,
      name: a.name || a.file_token,
      size: Number(a.size || 0),
      previewUrl: a.tmp_url || a.url || '',
      progress: 100,
      existing: true,
    }));
}

const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

interface DropZoneProps {
  onClick: () => void;
  text: string;
  onDropFiles: (files: File[]) => void;
}

function DropZone({ onClick, text, onDropFiles }: DropZoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDropFiles(Array.from(e.dataTransfer.files || [])); }}
      className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border py-6 text-center transition-colors hover:bg-accent/50"
    >
      <UploadCloud className="size-6 text-primary" />
      <div className="text-sm">{text}</div>
      <div className="text-xs text-muted-foreground">点击或拖拽文件到此处</div>
    </div>
  );
}

interface ImagePickerSectionProps {
  images: MediaItem[];
  overallProgress: number;
  onPick: (files: File[]) => void;
  onRemove: (item: MediaItem) => void;
}

export function ImagePickerSection({ images, overallProgress, onPick, onRemove }: ImagePickerSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label>图片素材 <span className="text-destructive">*</span></Label>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((item) => (
            <div key={item.key} className="relative overflow-hidden rounded-lg border border-border">
              <Image src={item.previewUrl} alt={item.name} className="h-24 w-full object-cover" />
              <button type="button" onClick={() => onRemove(item)} className="absolute right-1 top-1 rounded bg-background/90 p-1 text-muted-foreground hover:text-destructive">
                <X className="size-3.5" />
              </button>
              {item.progress < 100 ? (
                <div className="absolute inset-x-1 bottom-1"><Progress value={item.progress} className="h-1.5" /></div>
              ) : null}
              <div className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{item.name} · {fmtSize(item.size)}</div>
            </div>
          ))}
        </div>
      ) : null}
      {overallProgress > 0 && overallProgress < 100 ? <Progress value={overallProgress} /> : null}
      <DropZone onClick={() => inputRef.current?.click()} onDropFiles={onPick} text="上传图片（png/jpg/jpeg/gif/webp，单张 ≤10MB，可多张）" />
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple className="hidden" onChange={(e) => { onPick(Array.from(e.target.files || [])); e.target.value = ''; }} />
    </div>
  );
}

interface VideoPickerSectionProps {
  video: MediaItem | null;
  cover: MediaItem | null;
  onPickVideo: (file: File) => void;
  onRemoveVideo: () => void;
  onPickCover: (file: File) => void;
  onRemoveCover: () => void;
}

export function VideoPickerSection({ video, cover, onPickVideo, onRemoveVideo, onPickCover, onRemoveCover }: VideoPickerSectionProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label>视频文件 <span className="text-destructive">*</span></Label>
      {video ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {video.token && video.previewUrl ? (
            <video src={video.previewUrl} controls className="max-h-48 w-full rounded-md bg-black" />
          ) : null}
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{video.name}</span>
            <span className="text-xs text-muted-foreground">{fmtSize(video.size)}</span>
            <button type="button" onClick={onRemoveVideo} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          {video.progress < 100 ? <Progress value={video.progress} /> : null}
        </div>
      ) : (
        <DropZone onClick={() => videoInputRef.current?.click()} onDropFiles={(files) => { if (files[0]) onPickVideo(files[0]); }} text="上传视频（mp4/mov/webm，≤100MB，大于 20MB 自动分片上传）" />
      )}
      <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickVideo(f); e.target.value = ''; }} />
      <div className="space-y-1.5">
        <Label>视频封面（可选）</Label>
        {cover ? (
          <div className="flex items-center gap-2 rounded-lg border border-border p-2">
            <Image src={cover.previewUrl} alt={cover.name} className="h-12 w-20 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-xs">{cover.name}</span>
            <button type="button" onClick={onRemoveCover} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>上传封面</Button>
        )}
        {cover && cover.progress < 100 ? <Progress value={cover.progress} /> : null}
        <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickCover(f); e.target.value = ''; }} />
      </div>
      {video && video.token && video.previewUrl ? (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Play className="size-3" /> 传完可内联预览，删除后可重新上传
        </div>
      ) : null}
    </div>
  );
}
