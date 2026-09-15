import { useEffect, useState } from 'react';
import { FileImage, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Image } from '@client/src/components/ui/image';

export interface ThumbAttachment {
  file_token: string;
  name?: string;
  size?: number;
  url?: string;
  tmp_url?: string;
}

export function pickFirstAttachment(value: unknown): ThumbAttachment | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as Partial<ThumbAttachment> | undefined;
  if (!first || !first.file_token) return null;
  return first as ThumbAttachment;
}

export function pickMediaUrl(att: ThumbAttachment | null | undefined): string {
  return att?.tmp_url || att?.url || '';
}

interface InitialThumbProps {
  name: string;
  icon?: boolean;
  className?: string;
}

function InitialThumb({ name, icon, className }: InitialThumbProps) {
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-1 bg-accent text-accent-foreground', className)}>
      {icon ? <FileImage className="size-7 opacity-60" /> : null}
      <span className="max-w-[80%] truncate text-sm font-semibold">{(name || '?').slice(0, 1)}</span>
    </div>
  );
}

interface MaterialThumbProps {
  materialType: string;
  attachments?: ThumbAttachment[] | null;
  cover?: ThumbAttachment | null;
  name: string;
  showPlayBadge?: boolean;
  className?: string;
}

export function MaterialThumb({
  materialType,
  attachments,
  cover,
  name,
  showPlayBadge,
  className,
}: MaterialThumbProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const isVideo = materialType === 'video';
  const att = pickFirstAttachment(attachments);
  const coverUrl = pickMediaUrl(cover);

  useEffect(() => {
    setImgFailed(false);
    setVideoFailed(false);
  }, [coverUrl, pickMediaUrl(att)]);

  let body: React.ReactNode;
  if (isVideo) {
    const videoUrl = pickMediaUrl(att);
    if (coverUrl && !imgFailed) {
      body = <Image src={coverUrl} alt={name} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />;
    } else if (videoUrl && !videoFailed) {
      body = (
        <video
          src={videoUrl}
          preload="metadata"
          muted
          className="h-full w-full object-cover"
          onError={() => setVideoFailed(true)}
        />
      );
    } else {
      body = <InitialThumb name={name} />;
    }
  } else {
    const url = pickMediaUrl(att);
    if (url && !imgFailed) {
      body = <Image src={url} alt={name} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />;
    } else {
      body = <InitialThumb name={name} icon />;
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {body}
      {showPlayBadge && isVideo ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <div className="flex size-10 items-center justify-center rounded-full bg-background/90 shadow-md">
            <Play className="ml-0.5 size-4 text-primary" fill="currentColor" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
