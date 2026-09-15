import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export interface MediaUploadResult {
  file_token: string;
  name: string;
  size: number;
  type: string;
}

export interface UploadAttachment {
  file_token: string;
  name: string;
  size: number;
  type: string;
}

const SINGLE_LIMIT = 20 * 1024 * 1024;
const BLOCK_SIZE = 4 * 1024 * 1024;

function extractError(data: { code?: number; message?: string; msg?: string } | undefined, fallback: string): string {
  if (data && data.code !== 0) {
    return data.message || data.msg || fallback;
  }
  return fallback;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function resolveAppPrefix(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.pathname.match(/^(\/app\/app_\w+\/)/);
  return m ? m[1] : '';
}

function xhrUpload(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void,
): Promise<{ code?: number; message?: string; data?: MediaUploadResult }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${resolveAppPrefix()}${url.replace(/^\//, '')}`);
    xhr.withCredentials = true;
    const csrf = readCookie('suda-csrf-token');
    if (csrf) xhr.setRequestHeader('x-suda-csrf-token', csrf);
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { code?: number; message?: string; data?: MediaUploadResult };
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data?.message || `上传失败 (${xhr.status})`));
        }
      } catch {
        reject(new Error(`上传失败 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误，请重试'));
    xhr.send(form);
  });
}

export async function uploadMedia(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MediaUploadResult> {
  if (!file || file.size === 0) {
    throw new Error('文件为空，无法上传');
  }
  if (file.size <= SINGLE_LIMIT) {
    return uploadAll(file, onProgress);
  }
  return uploadChunked(file, onProgress);
}

async function uploadAll(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MediaUploadResult> {
  const form = new FormData();
  form.append('file', file);
  const data = await xhrUpload('/api/upload', form, onProgress);
  if (data?.code !== 0 || !data.data?.file_token) {
    throw new Error(extractError(data, '上传飞书失败'));
  }
  onProgress?.(100);
  return data.data;
}

async function uploadChunked(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MediaUploadResult> {
  const prep = await axiosForBackend.post('/api/upload/prepare', {
    file_name: file.name,
    size: file.size,
  });
  const prepData = prep.data as {
    code?: number;
    message?: string;
    msg?: string;
    data?: { upload_id?: string; block_num?: number };
  };
  if (prepData?.code !== 0 || !prepData.data?.upload_id) {
    throw new Error(extractError(prepData, '初始化分片上传失败'));
  }
  const uploadId = prepData.data.upload_id;
  const blockNum = prepData.data.block_num || Math.ceil(file.size / BLOCK_SIZE);
  let uploaded = 0;
  for (let i = 0; i < blockNum; i++) {
    const start = i * BLOCK_SIZE;
    const blob = file.slice(start, Math.min(start + BLOCK_SIZE, file.size));
    const form = new FormData();
    form.append('upload_id', uploadId);
    form.append('block_num', String(i));
    form.append('block', blob, `${file.name}.part${i}`);
    const res = await xhrUpload('api/upload/part', form);
    const partData = res as { code?: number; message?: string; msg?: string };
    if (partData?.code !== 0) {
      throw new Error(extractError(partData, `分片 ${i + 1}/${blockNum} 上传失败`));
    }
    uploaded += blob.size;
    onProgress?.(Math.min(99, Math.round((uploaded / file.size) * 100)));
  }
  const fin = await axiosForBackend.post('/api/upload/finish', {
    upload_id: uploadId,
    block_num: blockNum,
  });
  const finData = fin.data as {
    code?: number;
    message?: string;
    msg?: string;
    data?: { file_token?: string } | null;
  };
  if (finData?.code !== 0) {
    throw new Error(extractError(finData, '完成分片上传失败'));
  }
  const fileToken = finData.data?.file_token || '';
  if (!fileToken) {
    throw new Error('完成分片上传后未返回 file_token');
  }
  onProgress?.(100);
  return { file_token: fileToken, name: file.name, size: file.size, type: file.type };
}
