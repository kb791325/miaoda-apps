import { remoteUpdateWins } from '../../../server/src/common/utils/lww';

describe('remoteUpdateWins（LWW 冲突裁决）', () => {
  it('远端更新时间晚于本地 → 远端胜', () => {
    const wins: boolean = remoteUpdateWins(
      '2026-01-02T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
    expect(wins).toBe(true);
  });

  it('本地更新时间晚于远端 → 本地胜', () => {
    const wins: boolean = remoteUpdateWins(
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
    );
    expect(wins).toBe(false);
  });

  it('时间相等 → 平局保留本地', () => {
    const wins: boolean = remoteUpdateWins(
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
    expect(wins).toBe(false);
  });

  it('远端时间为 null/undefined/空串 → 不覆盖', () => {
    expect(remoteUpdateWins(null, '2026-01-01T00:00:00.000Z')).toBe(false);
    expect(remoteUpdateWins(undefined, '2026-01-01T00:00:00.000Z')).toBe(
      false,
    );
    expect(remoteUpdateWins('  ', '2026-01-01T00:00:00.000Z')).toBe(false);
  });

  it('远端时间不可解析 → 不覆盖', () => {
    const wins: boolean = remoteUpdateWins(
      'not-a-date',
      '2026-01-01T00:00:00.000Z',
    );
    expect(wins).toBe(false);
  });

  it('本地无更新时间（新入库）且远端合法 → 远端胜', () => {
    expect(remoteUpdateWins('2026-01-01T00:00:00.000Z', null)).toBe(true);
    expect(remoteUpdateWins('2026-01-01T00:00:00.000Z', undefined)).toBe(
      true,
    );
  });

  it('本地时间不可解析且远端合法 → 远端胜', () => {
    const wins: boolean = remoteUpdateWins(
      '2026-01-01T00:00:00.000Z',
      'bad-local-date',
    );
    expect(wins).toBe(true);
  });
});
