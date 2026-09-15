import { Image as ImageIcon, Play, FileText } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { cn } from '@/lib/utils';

export interface MaterialAttachment {
  file_token: string;
  name: string;
  size: number;
  url?: string;
}

const VIDEO_EXTS = ['mp4', 'mov', 'webm'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

export function getExt(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

export function isVideoName(name: string): boolean {
  return VIDEO_EXTS.includes(getExt(name));
}

export function isImageName(name: string): boolean {
  return IMAGE_EXTS.includes(getExt(name));
}

export function parseAttachments(value: unknown): MaterialAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it: Record<string, unknown>) => ({
      file_token: String(it.file_token || it.attachment_token || ''),
      name: String(it.name || ''),
      size: Number(it.size || 0),
      url: typeof it.url === 'string' && it.url ? it.url : undefined,
    }))
    .filter((a: MaterialAttachment) => a.file_token !== '');
}

export function splitAttachments(atts: MaterialAttachment[]): {
  video?: MaterialAttachment;
  cover?: MaterialAttachment;
  images: MaterialAttachment[];
} {
  const videos: MaterialAttachment[] = atts.filter((a) => isVideoName(a.name));
  const images: MaterialAttachment[] = atts.filter((a) => isImageName(a.name));
  return { video: videos[0], cover: images[0], images };
}

export function fmtSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

interface PlaceholderProps {
  kind: 'image' | 'video' | 'file';
  label?: string;
  className?: string;
}

function MediaPlaceholder({ kind, label, className }: PlaceholderProps) {
  const Icon = kind === 'video' ? Play : kind === 'image' ? ImageIcon : FileText;
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/70 to-chart-2/70',
        className,
      )}
    >
      <Icon className="size-9 text-white/85" />
      {label ? (
        <span className="max-w-[90%] truncate px-2 text-[10px] text-white/85">{label}</span>
      ) : null}
    </div>
  );
}

interface MaterialMediaProps {
  type: string;
  attachments: MaterialAttachment[];
  className?: string;
}

export function MaterialMedia({ type, attachments, className }: MaterialMediaProps) {
  const { video, cover, images } = splitAttachments(attachments);

  if (type === 'video' && video) {
    if (video.url) {
      return (
        <video
          src={video.url}
          poster={cover?.url}
          controls
          preload="metadata"
          className={cn('h-full w-full bg-black object-contain', className)}
        />
      );
    }
    return <MediaPlaceholder kind="video" label={video.name} className={className} />;
  }

  const firstImage = images[0];
  if (firstImage?.url) {
    return (
      <div className={cn('relative h-full w-full', className)}>
        <Image
          src={firstImage.url}
          alt={firstImage.name}
          className="h-full w-full object-cover"
        />
        {images.length > 1 ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
            +{images.length - 1}
          </span>
        ) : null}
      </div>
    );
  }

  if (firstImage) {
    return <MediaPlaceholder kind="image" label={firstImage.name} className={className} />;
  }

  return (
    <MediaPlaceholder
      kind={type === 'video' ? 'video' : 'image'}
      className={className}
    />
  );
}
