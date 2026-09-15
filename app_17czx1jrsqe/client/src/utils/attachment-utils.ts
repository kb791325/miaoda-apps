export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)suda-csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function getNToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)n-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const BASE_PATH = process.env.CLIENT_BASE_PATH || '';

export function buildAttachmentProxyUrl(
  fileToken: string,
  extra?: string,
): string {
  const params = new URLSearchParams();
  params.set('fileToken', fileToken);
  if (extra) params.set('extra', extra);
  return `${BASE_PATH}/api/upload/download?${params.toString()}`;
}

export function getResumeMime(fileName: string, fallback?: string): string {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };
  return map[ext] || fallback || 'application/octet-stream';
}

export async function fetchAttachmentBlob(
  fileToken: string,
  extra?: string,
): Promise<Blob> {
  const url = buildAttachmentProxyUrl(fileToken, extra);
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {};
  if (csrfToken) headers['x-suda-csrf-token'] = csrfToken;

  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`下载失败 (${res.status})`);
  return res.blob();
}

export async function fetchAttachmentArrayBuffer(
  fileToken: string,
  extra?: string,
): Promise<ArrayBuffer> {
  const url = buildAttachmentProxyUrl(fileToken, extra);
  const csrfToken = getCsrfToken();
  const nToken = getNToken();
  const headers: Record<string, string> = {};
  if (csrfToken) headers['x-suda-csrf-token'] = csrfToken;
  if (nToken) headers['x-n-token'] = nToken;

  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`下载失败 (${res.status})`);
  return res.arrayBuffer();
}

export async function downloadAttachment(
  fileToken: string,
  fileName: string,
  extra?: string,
): Promise<void> {
  const blob = await fetchAttachmentBlob(fileToken, extra);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function buildAttachmentPermExtra(
  tableId: string,
  rev?: number,
): string {
  return JSON.stringify({
    bitablePerm: { tableId, rev: rev ?? 5 },
  });
}