export type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

export function getPageNumbers(
  current: number,
  total: number,
  siblingCount: number = 1,
): PageToken[] {
  const maxVisible: number = siblingCount * 2 + 5;
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_: unknown, i: number) => i + 1);
  }
  const left: number = Math.max(current - siblingCount, 2);
  const right: number = Math.min(current + siblingCount, total - 1);
  const tokens: PageToken[] = [1];
  if (left > 2) tokens.push('ellipsis-left');
  for (let p = left; p <= right; p += 1) tokens.push(p);
  if (right < total - 1) tokens.push('ellipsis-right');
  tokens.push(total);
  return tokens;
}
