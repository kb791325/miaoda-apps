export interface UploadedMedia {
  file_token: string;
  name?: string;
  size?: number;
  type?: string;
}

export interface MaterialAttachment {
  file_token: string;
  name?: string;
  size?: number;
  url?: string;
  tmp_url?: string;
}

export interface PrepareUploadResult {
  upload_id: string;
  block_size?: number;
  block_num?: number;
}

export type ProgressHandler = (percent: number) => void;
