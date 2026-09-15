import { createRateLimiter, type RateLimiter } from '../../../server/src/common/utils/rate-limit';

const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('createRateLimiter 滑动窗口', () => {
  it('窗口内不超过 max 全部放行', () => {
    const limiter: RateLimiter = createRateLimiter({
      windowMs: 10000,
      max: 3,
    });
    expect(limiter.allow('k1')).toBe(true);
    expect(limiter.allow('k1')).toBe(true);
    expect(limiter.allow('k1')).toBe(true);
  });

  it('窗口内超过 max 拒绝', () => {
    const limiter: RateLimiter = createRateLimiter({
      windowMs: 10000,
      max: 2,
    });
    expect(limiter.allow('k1')).toBe(true);
    expect(limiter.allow('k1')).toBe(true);
    expect(limiter.allow('k1')).toBe(false);
  });

  it('不同 key 独立计数', () => {
    const limiter: RateLimiter = createRateLimiter({
      windowMs: 10000,
      max: 1,
    });
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    expect(limiter.allow('b')).toBe(true);
  });

  it('窗口过期后恢复放行（小窗口实测）', async () => {
    const limiter: RateLimiter = createRateLimiter({
      windowMs: 40,
      max: 2,
    });
    expect(limiter.allow('k')).toBe(true);
    expect(limiter.allow('k')).toBe(true);
    expect(limiter.allow('k')).toBe(false);
    await sleep(80);
    expect(limiter.allow('k')).toBe(true);
  }, 10000);
});
