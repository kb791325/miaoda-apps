import { useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import { Loader2, Paperclip, Upload, X } from 'lucide-react';
import { uploadFile } from '@client/src/components/business-ui/api/files/service';
import { checkAttachmentFile } from '@client/src/utils/file-check';
import type { AttachmentItem } from '@shared/content';
import {
  isDocFile,
  isImageFile,
  parseMaterialFile,
} from '@client/src/services/ai-material-parse';
import { extractErrorMessage } from './content.api';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface ContentMaterialPanelProps {
  attachments: AttachmentItem[];
  onCommit: (next: AttachmentItem[]) => Promise<void> | void;
  parseEnabled?: boolean;
  onSummaryChange?: (summary: string) => void;
}

export const ContentMaterialPanel: FC<ContentMaterialPanelProps> = ({
  attachments,
  onCommit,
  parseEnabled = false,
  onSummaryChange,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileByUrlRef = useRef<Map<string, File>>(new Map());
  const summaryRef = useRef<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [parsingUrls, setParsingUrls] = useState<string[]>([]);
  const [summaryText, setSummaryText] = useState<string>('');

  const commit = async (next: AttachmentItem[]) => {
    try {
      await onCommit(next);
    } catch (error) {
      toast.error(extractErrorMessage(error, '材料保存失败'));
    }
  };

  const updateSummary = (next: string) => {
    summaryRef.current = next;
    setSummaryText(next);
    onSummaryChange?.(next);
  };

  const appendSummary = (block: string) => {
    const prev: string = summaryRef.current;
    updateSummary(prev.trim() ? `${prev}\n\n${block}` : block);
  };

  const parseOne = async (item: AttachmentItem, file: File) => {
    setParsingUrls((prev: string[]) => [...prev, item.url]);
    try {
      const text: string = await parseMaterialFile(file);
      if (text) {
        appendSummary(`【${item.name}】\n${text}`);
      } else {
        toast.warning(`未能从「${item.name}」提取到文本内容`);
      }
    } catch (error) {
      toast.error(
        extractErrorMessage(error, `「${item.name}」解析失败，可手动填写摘要`),
      );
    } finally {
      setParsingUrls((prev: string[]) =>
        prev.filter((url: string) => url !== item.url),
      );
    }
  };

  const handleFiles = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files: File[] = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    for (const file of files) {
      const checkError: string | null = checkAttachmentFile(file);
      if (checkError) {
        toast.error(checkError);
        return;
      }
    }
    setUploading(true);
    try {
      const items: AttachmentItem[] = [];
      for (const file of files) {
        const result = await uploadFile(file);
        fileByUrlRef.current.set(result.url, file);
        items.push({ name: file.name, url: result.url });
      }
      await commit([...attachments, ...items]);
      toast.success('材料已上传');
      if (parseEnabled) {
        for (const item of items) {
          const file: File | undefined = fileByUrlRef.current.get(item.url);
          if (!file || (!isImageFile(file) && !isDocFile(file))) continue;
          void parseOne(item, file);
        }
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, '材料上传失败'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">相关材料（可选）</p>
        <Button
          type="button"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          上传材料
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        建议先上传图片或文档材料，上传后自动提取内容生成材料摘要，正文将基于材料生成；也可以不上传。
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          void handleFiles(event)
        }
      />
      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((item: AttachmentItem) => (
            <li
              key={item.url}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <UniversalLink
                to={item.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm hover:text-primary hover:underline"
              >
                {item.name}
              </UniversalLink>
              {parsingUrls.includes(item.url) && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  解析中
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() =>
                  void commit(
                    attachments.filter(
                      (entry: AttachmentItem) => entry.url !== item.url,
                    ),
                  )
                }
                aria-label="移除材料"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {parseEnabled && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            材料摘要（可编辑，生成正文时作为参考）
          </p>
          <Textarea
            rows={5}
            placeholder="上传材料后自动填充，也可手动填写补充"
            value={summaryText}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              updateSummary(event.target.value)
            }
          />
        </div>
      )}
    </div>
  );
};
