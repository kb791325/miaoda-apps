import { useRef, useState } from 'react';
import { Loader2, Paperclip, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@client/src/pages/Inventory/inventory-utils';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface ExpenseAttachmentFieldProps {
  value: string;
  onChange: (url: string) => void;
}

/** 费用附件上传：经 dataloom 上传后回传 download_url；失败仅提示不阻断保存 */
const ExpenseAttachmentField: React.FC<ExpenseAttachmentFieldProps> = ({
  value,
  onChange,
}) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataloom = await getDataloom();
      const { data, error } = await dataloom.storage
        .from(getDefaultBucketId())
        .uploadFile(file);
      if (error || !data) {
        throw new Error(error?.message ?? '未知错误');
      }
      onChange(data.download_url);
      toast.success('附件上传成功');
    } catch (uploadError: unknown) {
      toast.error(`附件上传失败：${extractErrorMessage(uploadError)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-semibold">附件（可选）</label>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-border p-3">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
          <UniversalLink
            to={value}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
          >
            已上传附件
          </UniversalLink>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
          >
            <X className="size-4" />
            移除
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              void handleUpload(event)
            }
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? '上传中…' : '上传附件'}
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        上传失败不影响保存，可稍后重试
      </p>
    </div>
  );
};

export default ExpenseAttachmentField;
