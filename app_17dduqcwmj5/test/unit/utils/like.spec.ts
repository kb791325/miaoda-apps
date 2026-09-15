import { escapeLikePattern, containsPattern } from '../../../server/src/common/utils/like';

describe('escapeLikePattern', () => {
  it('转义百分号', () => {
    const result: string = escapeLikePattern('50%');
    expect(result).toBe('50\\%');
  });

  it('转义下划线', () => {
    const result: string = escapeLikePattern('a_b');
    expect(result).toBe('a\\_b');
  });

  it('转义反斜杠', () => {
    const result: string = escapeLikePattern('a\\b');
    expect(result).toBe('a\\\\b');
  });

  it('同时转义 % _ \\ 三种字符', () => {
    const result: string = escapeLikePattern('%_\\');
    expect(result).toBe('\\%\\_\\\\');
  });

  it('普通文本原样返回', () => {
    const result: string = escapeLikePattern('正常关键词');
    expect(result).toBe('正常关键词');
  });

  it('空字符串原样返回', () => {
    expect(escapeLikePattern('')).toBe('');
  });
});

describe('containsPattern', () => {
  it('生成 %...% 包裹的 pattern', () => {
    const result: string = containsPattern('abc');
    expect(result).toBe('%abc%');
  });

  it('内部通配符已转义后再包裹', () => {
    const result: string = containsPattern('%x_');
    expect(result).toBe('%\\%x\\_%');
  });
});
