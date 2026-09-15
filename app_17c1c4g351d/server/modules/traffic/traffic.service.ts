import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { channel, trafficKeyword } from '../../database/schema';
import type {
  TrafficChannel,
  TrafficKeyword,
} from '@shared/api.interface';

@Injectable()
export class TrafficService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(): Promise<{ channels: TrafficChannel[]; keywords: TrafficKeyword[] }> {
    const [channelRows, keywordRows] = await Promise.all([
      this.db.select().from(channel),
      this.db.select().from(trafficKeyword),
    ]);

    const channels: TrafficChannel[] = channelRows.map((row) => ({
      id: row.id,
      name: row.name,
      cost: Number(row.cost),
      clicks: row.clicks,
      ctr: Number(row.ctr),
      conversionRate: Number(row.conversionRate),
      gmv: Number(row.gmv),
      roi: Number(row.roi),
    }));

    const keywords: TrafficKeyword[] = keywordRows.map((row) => ({
      id: row.id,
      content: row.content,
      type: row.type,
      clicks: row.clicks,
      conversionRate: Number(row.conversionRate),
      gmv: Number(row.gmv),
      roi: Number(row.roi),
    }));

    return { channels, keywords };
  }
}
