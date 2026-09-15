/**
 * 分页参数解析工具：统一各模块 controller/service 的分页解析逻辑。
 * page 默认 1；pageSize 默认 20、上限 100；非法值回退默认。
 */

const DEFAULT_PAGE: number = 1;
const DEFAULT_PAGE_SIZE: number = 20;
const MAX_PAGE_SIZE: number = 100;

function toPositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed: number = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function parsePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number; offset: number } {
  const page: number = toPositiveInt(query.page) ?? DEFAULT_PAGE;
  const pageSize: number = Math.min(
    toPositiveInt(query.pageSize) ?? DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}
