import { useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Image } from '@client/src/components/ui/image';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { uploadFile } from '@client/src/components/business-ui/api/files/service';
import { checkImageFile } from '@client/src/utils/file-check';
import type { AttachmentItem } from '@shared/content';
import { generatePosterImages } from '@client/src/services/ai-poster';
import { extractErrorMessage } from './content.api';

export interface MediaState {
  posterImages: string[];
  attachments: AttachmentItem[];
}

interface ContentMediaPanelProps {
  posterImages: string[];
  attachments: AttachmentItem[];
  contentHint: { title: string; body: string };
  onCommit: (next: MediaState) => Promise<void> | void;
}

export const ContentMediaPanel: FC<ContentMediaPanelProps> = ({
  posterImages,
  attachments,
  contentHint,
  onCommit,
}) => {
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const referenceFilesRef = useRef<File[]>([]);
  const [referenceCount, setReferenceCount] = useState<number>(0);
  const [uploadingPoster, setUploadingPoster] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const commit = async (next: MediaState) => {
    try {
      await onCommit(next);
    } catch (error) {
      toast.error(extractErrorMessage(error, '素材保存失败'));
    }
  };

  const handlePosterFiles = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files: File[] = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const invalidFile: File | undefined = files.find(
      (file: File) => checkImageFile(file) !== null,
    );
    if (invalidFile) {
      toast.error(checkImageFile(invalidFile) ?? '图片文件不符合要求');
      return;
    }
    setUploadingPoster(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const result = await uploadFile(file);
        urls.push(result.url);
      }
      const nextRefs: File[] = [
        ...referenceFilesRef.current,
        ...files,
      ].slice(-3);
      referenceFilesRef.current = nextRefs;
      setReferenceCount(nextRefs.length);
      await commit({
        posterImages: [...posterImages, ...urls],
        attachments,
      });
      toast.success('宣传图已上传');
    } catch (error) {
      toast.error(extractErrorMessage(error, '宣传图上传失败'));
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!contentHint.title.trim() || !contentHint.body.trim()) {
      toast.warning('请先生成或填写标题和正文，再生成宣传图');
      return;
    }
    setGenerating(true);
    try {
      const images: string[] = await generatePosterImages({
        title: contentHint.title,
        body: contentHint.body,
        referenceFiles: referenceFilesRef.current,
      });
      if (images.length === 0) {
        toast.error('AI 未返回图片，请重试');
        return;
      }
      await commit({
        posterImages: [...posterImages, ...images],
        attachments,
      });
      toast.success('宣传图已生成');
    } catch (error) {
      toast.error(extractErrorMessage(error, '宣传图生成失败'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">宣传图</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={generating || uploadingPoster}
            onClick={() => void handleGenerate()}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating
              ? '生成中...'
              : referenceCount > 0
                ? '基于材料生成宣传图'
                : 'AI 生成宣传图'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadingPoster || generating}
            onClick={() => posterInputRef.current?.click()}
          >
            {uploadingPoster ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            上传宣传图
          </Button>
        </div>
      </div>
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          void handlePosterFiles(event)
        }
      />
      {posterImages.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {posterImages.map((url: string) => (
            <div key={url} className="relative">
              <Image
                src={url}
                alt="宣传图"
                className="aspect-[3/4] w-full rounded-md border object-cover transition-transform hover:scale-[1.02]"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 size-6 rounded-full"
                onClick={() =>
                  void commit({
                    posterImages: posterImages.filter(
                      (item: string) => item !== url,
                    ),
                    attachments,
                  })
                }
                aria-label="移除宣传图"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {generating && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          {referenceCount > 0
            ? 'AI 正在参考上传材料生成宣传图，请稍候...'
            : 'AI 正在根据内容生成宣传图，请稍候...'}
        </p>
      )}
    </div>
  );
};
