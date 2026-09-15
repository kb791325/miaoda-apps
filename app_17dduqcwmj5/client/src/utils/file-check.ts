const MAX_IMAGE_SIZE_BYTES: number = 10 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES: number = 20 * 1024 * 1024;

/** 校验图片文件：类型必须为 image/*，大小不超过 10MB；通过返回 null，否则返回错误文案 */
export function checkImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return '仅支持上传图片文件';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return '图片大小不能超过 10MB';
  }
  return null;
}

/** 校验通用附件：大小不超过 20MB；通过返回 null，否则返回错误文案 */
export function checkAttachmentFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `文件「${file.name}」超过 20MB，无法上传`;
  }
  return null;
}
