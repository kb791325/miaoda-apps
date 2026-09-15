import { BadRequestException } from '@nestjs/common';
import {
  assertPaymentStatus,
  assertStudyProgress,
  PAYMENT_STATUS_VALUES,
  STUDY_PROGRESS_VALUES,
} from '../../../server/src/common/utils/student-status';

describe('assertPaymentStatus', () => {
  it.each([...PAYMENT_STATUS_VALUES])('合法值 %s 通过', (value: string) => {
    expect(() => assertPaymentStatus(value)).not.toThrow();
  });

  it('非法值抛 BadRequestException', () => {
    expect(() => assertPaymentStatus('已退款')).toThrow(BadRequestException);
  });

  it('空字符串抛 BadRequestException', () => {
    expect(() => assertPaymentStatus('')).toThrow(BadRequestException);
  });
});

describe('assertStudyProgress', () => {
  it.each([...STUDY_PROGRESS_VALUES])('合法值 %s 通过', (value: string) => {
    expect(() => assertStudyProgress(value)).not.toThrow();
  });

  it('非法值抛 BadRequestException', () => {
    expect(() => assertStudyProgress('已退学')).toThrow(BadRequestException);
  });

  it('异常消息包含合法值列表', () => {
    expect(() => assertStudyProgress('x')).toThrow('学习进度仅支持');
  });
});
