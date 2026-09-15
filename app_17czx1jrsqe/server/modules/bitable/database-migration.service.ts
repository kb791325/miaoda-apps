import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseMigrationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async onModuleInit() {
    this.logger.log('开始执行启动迁移...');
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS file_storage_mapping (
          file_token text PRIMARY KEY,
          file_path text NOT NULL,
          _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          _created_by user_profile DEFAULT (
            CASE
              WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
              ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
            END
          ),
          _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          _updated_by user_profile DEFAULT (
            CASE
              WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
              ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
            END
          )
        )
      `);
      this.logger.log('file_storage_mapping 表已确认存在');
    } catch (e: any) {
      this.logger.error(`启动迁移失败: ${e?.message}`);
    }
  }
}