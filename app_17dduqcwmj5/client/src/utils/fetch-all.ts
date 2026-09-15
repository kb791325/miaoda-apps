/** 分页结果最小契约 */
export interface PagedResult<T> {
  items: T[];
  total: number;
}

const DEFAULT_PAGE_SIZE: number = 100;
/** 安全上限，防止后端 total 异常导致死循环 */
const MAX_PAGES: number = 100;

/**
 * 循环翻页拉取全量数据，用于下拉选项等需要完整集合的场景。
 * 按返回的 total 判断是否取完；空页或达到 total 即停止。
 */
export const fetchAllPages = async <T>(
  fetchPage: (page: number, pageSize: number) => Promise<PagedResult<T>>,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<T[]> => {
  const all: T[] = [];
  let page: number = 1;
  while (page <= MAX_PAGES) {
    const result: PagedResult<T> = await fetchPage(page, pageSize);
    all.push(...result.items);
    if (result.items.length === 0 || all.length >= result.total) {
      break;
    }
    page += 1;
  }
  return all;
};
