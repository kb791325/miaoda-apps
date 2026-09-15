import { BadRequestException } from '@nestjs/common';
import { assertTextLimit, assertArrayLimit } from '../../../server/src/common/utils/input-limit';

describe('assertTextLimit', () => {
  it('超限抛 BadRequestException 且消息含字段标签与上限', () => {
    const tooLong: string = 'a'.repeat(201);
    expect(() => assertTextLimit(tooLong, 200, '标题')).toThrow(
      BadRequestException,
    );
    expect(() => assertTextLimit(tooLong, 200, '标题')).toThrow(
      '标题长度不能超过 200 个字符',
    );
  });

  it('恰好等于上限通过', () => {
    const exact: string = 'a'.repeat(200);
    expect(() => assertTextLimit(exact, 200, '标题')).not.toThrow();
  });

  it('不超限通过', () => {
    expect(() => assertTextLimit('短文本', 200, '标题')).not.toThrow();
  });

  it('null/undefined 空值跳过', () => {
    expect(() => assertTextLimit(null, 10, '标题')).not.toThrow();
    expect(() => assertTextLimit(undefined, 10, '标题')).not.toThrow();
  });
});

describe('assertArrayLimit', () => {
  it('超限抛 BadRequestException 且消息含字段标签', () => {
    const tooMany: number[] = [1, 2, 3, 4];
    expect(() => assertArrayLimit(tooMany, 3, '附件')).toThrow(
      BadRequestException,
    );
    expect(() => assertArrayLimit(tooMany, 3, '附件')).toThrow(
      '附件数量不能超过 3 个',
    );
  });

  it('恰好等于上限通过', () => {
    expect(() => assertArrayLimit([1, 2, 3], 3, '附件')).not.toThrow();
  });

  it('非数组跳过（字符串/对象/null/undefined）', () => {
    expect(() => assertArrayLimit('abc', 2, '附件')).not.toThrow();
    expect(() => assertArrayLimit({ length: 99 }, 2, '附件')).not.toThrow();
    expect(() => assertArrayLimit(null, 2, '附件')).not.toThrow();
    expect(() => assertArrayLimit(undefined, 2, '附件')).not.toThrow();
  });
});
