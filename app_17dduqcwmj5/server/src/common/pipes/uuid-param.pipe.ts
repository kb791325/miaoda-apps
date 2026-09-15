import { BadRequestException, PipeTransform } from '@nestjs/common';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw new BadRequestException('无效的记录 ID 格式');
    }
    return value;
  }
}

export function assertUuid(value: unknown, fieldName: string): void {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(`无效的 ${fieldName} ID 格式`);
  }
}

export function assertUuidArray(
  values: unknown[],
  fieldName: string,
): void {
  for (const value of values) {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw new BadRequestException(`无效的 ${fieldName} ID 格式`);
    }
  }
}

export function parseUuidQuery(
  value: string | undefined,
  fieldName: string,
): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  if (!UUID_PATTERN.test(value)) {
    throw new BadRequestException(`无效的 ${fieldName} 格式`);
  }
  return value;
}
