import { like } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { followUp, shipmentItem } from '@server/database/schema';

/** 具备读能力的 db 句柄（db 本体或事务） */
export type DbReader = Pick<PostgresJsDatabase, 'select'>;

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/iu.test(value);
}

function datePart(date: Date): string {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

function buildNos(
  existing: Array<{ no: string | null }>,
  prefix: string,
  count: number,
): string[] {
  let maxSeq = 0;
  for (const row of existing) {
    const seq = Number((row.no ?? '').slice(prefix.length));
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(maxSeq + 1 + i).padStart(3, '0')}`,
  );
}

/** 跟进编号：GJ + YYYYMMDD + 3 位序号（如 GJ20260910001） */
export async function generateFollowNo(db: DbReader): Promise<string> {
  const prefix = `GJ${datePart(new Date())}`;
  const rows: Array<{ no: string | null }> = await db
    .select({ no: followUp.followNo })
    .from(followUp)
    .where(like(followUp.followNo, `${prefix}%`));
  return buildNos(rows, prefix, 1)[0] ?? '';
}

/** 发货明细编号：MX + YYYYMMDD + 3 位序号，count 个连号 */
export async function generateDetailNos(
  db: DbReader,
  count: number,
): Promise<string[]> {
  if (count <= 0) return [];
  const prefix = `MX${datePart(new Date())}`;
  const rows: Array<{ no: string | null }> = await db
    .select({ no: shipmentItem.detailNo })
    .from(shipmentItem)
    .where(like(shipmentItem.detailNo, `${prefix}%`));
  return buildNos(rows, prefix, count);
}
