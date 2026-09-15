import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Image } from '@client/src/components/ui/image';
import { uploadFile } from '@client/src/components/business-ui/api/files/service';
import { checkImageFile } from '@client/src/utils/file-check';

interface CourseImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export const CourseImageField: React.FC<CourseImageFieldProps> = ({
  value,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const checkError: string | null = checkImageFile(file);
    if (checkError) {
      toast.error(checkError);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onChange(result.url);
    } catch {
      toast.error('图片上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt="课程产品图"
            width={160}
            className="aspect-[16/10] rounded-md border border-border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 size-6 rounded-full"
            onClick={() => onChange('')}
            aria-label="移除图片"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          上传产品图
        </Button>
      )}
    </div>
  );
};
