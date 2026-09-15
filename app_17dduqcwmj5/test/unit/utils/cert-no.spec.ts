import { computeNextCertNo } from '../../../server/src/common/utils/cert-no';

describe('computeNextCertNo', () => {
  it('空列表返回 0001', () => {
    const result: string = computeNextCertNo([], '2026-09-07');
    expect(result).toBe('PPX202609-0001');
  });

  it('null/undefined 条目被跳过', () => {
    const result: string = computeNextCertNo(
      [null, undefined],
      '2026-09-07',
    );
    expect(result).toBe('PPX202609-0001');
  });

  it('已有同前缀编号时取最大序号 +1', () => {
    const result: string = computeNextCertNo(
      ['PPX202609-0003', 'PPX202609-0001'],
      '2026-09-15',
    );
    expect(result).toBe('PPX202609-0004');
  });

  it('跨月前缀互不影响', () => {
    const result: string = computeNextCertNo(
      ['PPX202608-0012'],
      '2026-09-07',
    );
    expect(result).toBe('PPX202609-0001');
  });

  it('序号补零到 4 位', () => {
    const result: string = computeNextCertNo(
      ['PPX202609-9'],
      '2026-09-07',
    );
    expect(result).toBe('PPX202609-0010');
  });

  it('序号后缀非法时忽略该条目', () => {
    const result: string = computeNextCertNo(
      ['PPX202609-abc'],
      '2026-09-07',
    );
    expect(result).toBe('PPX202609-0001');
  });

  it('串行连续调用喂入递增列表不产生重复编号', () => {
    const existing: string[] = [];
    const issued: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      const next: string = computeNextCertNo(existing, '2026-09-07');
      existing.push(next);
      issued.push(next);
    }
    const unique: Set<string> = new Set<string>(issued);
    expect(unique.size).toBe(25);
    expect(issued[0]).toBe('PPX202609-0001');
    expect(issued[24]).toBe('PPX202609-0025');
  });
});
