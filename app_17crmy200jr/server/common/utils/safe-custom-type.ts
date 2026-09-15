export function safeParseUserProfile(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (value.startsWith('(') && value.endsWith(')')) {
      const inner = value.slice(1, -1);
      const userId = inner.split(',')[0]?.trim();
      return userId || null;
    }
    return value || null;
  }
  return null;
}

export function safeParseUserProfileArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches
      .map((m) => m.slice(1, -1).split(',')[0]?.trim())
      .filter((id): id is string => Boolean(id));
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => safeParseUserProfile(item))
      .filter((id): id is string => Boolean(id));
  }
  return [];
}

export function safeParseFileAttachment(
  value: unknown,
): { bucket_id: string; file_path: string } | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (value.startsWith('(') && value.endsWith(')')) {
      const inner = value.slice(1, -1);
      const parts = inner.split(',');
      const bucketId = parts[0]?.trim();
      const filePath = parts.slice(1).join(',').trim();
      if (bucketId && filePath) {
        return { bucket_id: bucketId, file_path: filePath };
      }
    }
  }
  return null;
}

export function safeParseFileAttachmentArray(
  value: unknown,
): { bucket_id: string; file_path: string }[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    const result: { bucket_id: string; file_path: string }[] = [];
    for (const m of matches) {
      const parts = m.slice(1, -1).split(',');
      const bucketId = parts[0]?.trim();
      const filePath = parts.slice(1).join(',').trim();
      if (bucketId && filePath) {
        result.push({ bucket_id: bucketId, file_path: filePath });
      }
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => safeParseFileAttachment(item))
      .filter(
        (item): item is { bucket_id: string; file_path: string } =>
          item !== null,
      );
  }
  return [];
}

export function safeParseTimestamptz(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  if (typeof value === 'number') {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}
